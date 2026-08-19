/**
 * Tests for the benchmark harness itself.
 *
 * A measurement tool nobody checks is just a second implementation with extra
 * authority: its numbers get quoted in decisions precisely because they look
 * objective. So every metric is verified against inputs whose answer is known
 * by construction, not by running the detector and eyeballing the output.
 *
 * Three kinds of test live here:
 *
 *   1. metric correctness — hand-built observations, arithmetic done by hand
 *   2. determinism — the same corpus and detector must produce the same report,
 *      or the committed baseline means nothing
 *   3. agreement with the pipeline — the harness restates the engine's framing
 *      constants, and a restatement rots unless something compares it
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SHIPPING_CONFIG, enginePipelineConstants } from '../benchmark/detectors';
import { SHIPPING_BUDGET, checkBudget } from '../benchmark/budgets';
import { buildCorpus } from '../benchmark/corpus';
import { diffBaseline, toBaseline } from '../benchmark/report';
import { runBenchmark, runCase } from '../benchmark/runner';
import {
  accuracyMetrics,
  clarityGateAnalysis,
  findOutliers,
  foldedCents,
  measureSettling,
  octaveOffset,
  percentile,
  rocAuc,
  stabilityMetrics,
  voicingMetrics,
} from '../benchmark/metrics';
import type { CaseResult, FrameObservation } from '../benchmark/types';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

const RATE = 11025;
const WINDOW = 512;
const HOP = 128;

/** One observation, with the time fields derived exactly as the runner does. */
function obs(index: number, patch: Partial<FrameObservation> = {}): FrameObservation {
  const startSample = index * HOP;
  return {
    index,
    startSample,
    timeSec: (startSample + WINDOW / 2) / RATE,
    availableSec: (startSample + WINDOW) / RATE,
    expectedHz: 440,
    scored: true,
    frequency: 440,
    stableFrequency: 440,
    clarity: 0.99,
    rms: 0.2,
    processingMs: 0.05,
    ...patch,
  };
}

/* ------------------------------------------------------------------ *
 * Statistics                                                          *
 * ------------------------------------------------------------------ */

test('percentile interpolates and does not mutate its input', () => {
  const values = [4, 1, 3, 2];
  assert.equal(percentile(values, 0), 1);
  assert.equal(percentile(values, 1), 4);
  assert.equal(percentile(values, 0.5), 2.5);
  assert.deepEqual(values, [4, 1, 3, 2], 'input order must survive');
  assert.ok(Number.isNaN(percentile([], 0.5)));
});

test('AUC is 1 for perfect separation, 0.5 for none, and handles ties', () => {
  assert.equal(rocAuc([3, 4, 5], [0, 1, 2]), 1);
  assert.equal(rocAuc([0, 1, 2], [3, 4, 5]), 0);
  // identical populations carry no information, ties averaged
  assert.equal(rocAuc([1, 1, 1], [1, 1, 1]), 0.5);
  // overlapping populations with ties on both shared values. Ranks: 1→1,
  // 2,2→2.5, 3,3→4.5, 4→6; positive rank sum 2.5+4.5+6 = 13, so
  // AUC = (13 − 3·4/2)/(3·3) = 7/9.
  assert.equal(rocAuc([2, 3, 4], [1, 2, 3]), 7 / 9);
  // an empty class is unmeasurable, not 0.5
  assert.equal(rocAuc([], [1, 2]), null);
});

test('cents and octave helpers agree on the classic sub-harmonic failure', () => {
  assert.equal(foldedCents(440, 440), 0);
  // exactly one octave low: folded error ~0, octave offset -1. The pairing that
  // makes "small cents error, 100% octave errors" readable in the report.
  assert.equal(foldedCents(220, 440), 0, 'and normalized, so reports never print "-0.00"');
  assert.equal(octaveOffset(220, 440), -1);
  assert.equal(octaveOffset(880, 440), 1);
  assert.equal(octaveOffset(445, 440), 0);
  assert.ok(Math.abs(foldedCents(440 * Math.pow(2, 50 / 1200), 440) - 50) < 1e-6);
});

/* ------------------------------------------------------------------ *
 * Metrics                                                             *
 * ------------------------------------------------------------------ */

test('accuracy excludes unscored frames and reports tolerance bands', () => {
  const sharp10 = 440 * Math.pow(2, 10 / 1200);
  const frames = [
    obs(0, { frequency: 440 }),
    obs(1, { frequency: sharp10 }),
    // straddling a transition: must not be counted at all
    obs(2, { frequency: 100, scored: false, expectedHz: undefined }),
    // detected nothing: contributes to voicing, never to accuracy
    obs(3, { frequency: null, stableFrequency: null }),
  ];

  const m = accuracyMetrics(frames);
  assert.ok(m !== null);
  assert.equal(m.scoredFrames, 2);
  assert.equal(m.withinCents[25], 1);
  assert.ok(Math.abs(m.withinCents[5] - 0.5) < 1e-9, 'one of two frames is inside 5¢');
  assert.ok(Math.abs(m.biasCents - 5) < 0.01, 'mean signed error of 0¢ and +10¢');
});

test('lost voice and false pitch are counted separately, never netted off', () => {
  const m = voicingMetrics([
    obs(0, { expectedHz: 440, frequency: 440 }),
    obs(1, { expectedHz: 440, frequency: null }), // missed real singing
    obs(2, { expectedHz: null, frequency: 300 }), // invented a pitch in silence
    obs(3, { expectedHz: null, frequency: null }),
  ]);
  assert.equal(m.lostVoiceRate, 0.5);
  assert.equal(m.falsePitchRate, 0.5);
});

test('jitter measures unsteadiness, not inaccuracy', () => {
  // consistently 30¢ sharp: wrong, but perfectly steady
  const biased = 440 * Math.pow(2, 30 / 1200);
  const steady = stabilityMetrics([0, 1, 2, 3, 4].map((i) => obs(i, { frequency: biased })));
  assert.ok(steady !== null);
  assert.ok(steady.jitterCents < 1e-6, `constant offset must read as stable, got ${steady.jitterCents}`);
  assert.equal(steady.noteFlipsPerSec, 0);

  // alternating either side of a note boundary: accurate on average, unusable
  const flip = 440 * Math.pow(2, 60 / 1200);
  const flicker = stabilityMetrics([0, 1, 2, 3, 4].map((i) => obs(i, { frequency: i % 2 ? flip : 440 })));
  assert.ok(flicker !== null);
  assert.ok(flicker.jitterCents > 25, `alternating pitch must read as jittery, got ${flicker.jitterCents}`);
  assert.ok(flicker.noteFlipsPerSec > 0, 'a note-name change on steady material is flicker');
});

test('settling is timed from when a reading could exist, and needs the pitch to hold', () => {
  const stepSample = 10 * HOP;
  const step = { atSample: stepSample, fromHz: 220, toHz: 440 };
  const frames: FrameObservation[] = [];
  for (let i = 0; i < 24; i++) {
    // the detector reports the new pitch from frame 14 onward
    frames.push(obs(i, { frequency: i >= 14 ? 440 : 220, stableFrequency: i >= 14 ? 440 : 220 }));
  }

  const m = measureSettling(frames, step, RATE);
  const expectedMs = ((14 * HOP + WINDOW) / RATE - stepSample / RATE) * 1000;
  assert.ok(m.settlingMs !== null);
  assert.ok(Math.abs(m.settlingMs - expectedMs) < 1e-6, `${m.settlingMs} vs ${expectedMs}`);
  assert.equal(m.semitones, 12);

  // a single frame that touches the new pitch and falls back has not settled:
  // taking the first touch would report a latency the singer never gets
  const flicker = frames.map((f, i) => (i === 12 ? obs(i, { frequency: 440, stableFrequency: 440 }) : f));
  const m2 = measureSettling(flicker, step, RATE);
  assert.ok(m2.settlingMs !== null);
  assert.ok(m2.settlingMs > expectedMs - 1e-6, 'an isolated correct frame must not count as settled');

  // never arriving is null, not an optimistic number
  const never = frames.map((f, i) => obs(i, { frequency: 220, stableFrequency: 220 }));
  assert.equal(measureSettling(never, step, RATE).settlingMs, null);
});

test('the clarity gate reports what a threshold would cost, not just whether one ranks', () => {
  // ranking is perfect — every voice frame scores above every music frame —
  // yet the threshold that rejects the music takes the breathy singing with it
  const gate = clarityGateAnalysis([0.99, 0.995], [0.75, 0.78], [0.9, 0.92]);
  assert.equal(rocAuc([0.99, 0.995], [0.9, 0.92]), 1, 'perfect ranking');
  assert.equal(gate.musicRejectingThreshold, 0.92);
  assert.equal(gate.voiceLostAtThatThreshold, 0.5, 'both breathy frames are rejected too');
});

test('outliers surface octave errors and wild frames, but not pinned failures', () => {
  const base: CaseResult = {
    caseId: 'x',
    label: 'x',
    group: 'accuracy',
    corpusKind: 'synthetic',
    frames: 10,
    excludedFrames: 0,
    excludedRate: 0,
    accuracy: null,
    octave: null,
    voicing: { frames: 10, detected: 10, lostVoiceRate: 0, falsePitchRate: 0 },
    stability: null,
    confidence: { clarity: { count: 0, mean: NaN, median: NaN, p95: NaN, max: NaN }, accuracyAuc: null, separation: null },
    settling: [],
    expectOctaveFailure: false,
    expectPitchMovement: false,
  };
  const withOctave = { ...base, caseId: 'octave', octave: { scoredFrames: 10, errorRate: 0.2, low: 2, high: 0 } };
  const pinned = { ...withOctave, caseId: 'pinned', expectOctaveFailure: true };

  const found = findOutliers([base, withOctave, pinned]);
  assert.deepEqual(found.map((c) => c.caseId), ['octave'], 'expected failures are not outliers');
});

test('diffBaseline is quiet on a match and names the path that moved', () => {
  const a = { bands: [{ bandId: 'mid', median: 0.28 }] };
  assert.deepEqual(diffBaseline(a, structuredClone(a)), []);
  // below the 0.1% tolerance: floating-point noise across Node versions
  assert.deepEqual(diffBaseline(a, { bands: [{ bandId: 'mid', median: 0.280001 }] }), []);

  const moved = diffBaseline(a, { bands: [{ bandId: 'mid', median: 0.35 }] });
  assert.equal(moved.length, 1);
  assert.match(moved[0], /bands\.0\.median: 0\.28 → 0\.35/);
});

/* ------------------------------------------------------------------ *
 * Determinism                                                         *
 * ------------------------------------------------------------------ */

test('the corpus is identical every time it is built', () => {
  const a = buildCorpus(RATE);
  const b = buildCorpus(RATE);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i].id, b[i].id);
    assert.deepEqual(Array.from(a[i].signal), Array.from(b[i].signal), `${a[i].id} is not reproducible`);
  }
});

test('a case produces the same readings on every run', () => {
  const [first] = buildCorpus(RATE);
  const a = runCase(SHIPPING_CONFIG, first).observations.map((o) => o.frequency);
  const b = runCase(SHIPPING_CONFIG, first).observations.map((o) => o.frequency);
  assert.deepEqual(a, b);
});

/* ------------------------------------------------------------------ *
 * Agreement with the shipping pipeline                                *
 * ------------------------------------------------------------------ */

test('the benchmark framing matches the framing pitchEngine actually uses', () => {
  // The engine's constants are module-private, so SHIPPING_CONFIG restates
  // them. If this fails, the benchmark has been measuring a pipeline the app no
  // longer runs — update SHIPPING_CONFIG and re-record the baseline.
  const source = readFileSync(join(HERE, '..', 'lib', 'pitchEngine.ts'), 'utf8');
  const engine = enginePipelineConstants(source);

  assert.equal(engine.sampleRate, SHIPPING_CONFIG.captureRateHz, 'capture rate');
  assert.equal(engine.decimate, SHIPPING_CONFIG.decimation, 'decimation factor');
  assert.equal(engine.window, SHIPPING_CONFIG.windowSamples, 'analysis window');
  assert.ok(engine.sampleRate !== null && engine.decimate !== null && engine.hop !== null);
  assert.equal(engine.sampleRate / engine.decimate, SHIPPING_CONFIG.analysisRateHz, 'analysis rate');
  assert.equal(engine.hop / engine.decimate, SHIPPING_CONFIG.hopSamples, 'hop, in decimated samples');
});

test('enginePipelineConstants reports absence rather than guessing', () => {
  const parsed = enginePipelineConstants('const HOP = 256;\nconst WINDOW = 1024;');
  assert.equal(parsed.hop, 256);
  assert.equal(parsed.window, 1024);
  assert.equal(parsed.sampleRate, null, 'a missing constant must be null, not a default');
});

/* ------------------------------------------------------------------ *
 * The shipping configuration, end to end                              *
 * ------------------------------------------------------------------ */

test('the shipping detector meets its measured budgets', () => {
  const report = runBenchmark(SHIPPING_CONFIG);
  const violations = checkBudget(report, SHIPPING_BUDGET);
  assert.deepEqual(
    violations,
    [],
    `budget violations:\n${violations.map((v) => `  ${v.bandId}/${v.metric}: ${v.measured} vs ${v.limit}`).join('\n')}`
  );
});

test('the committed baseline still describes the current implementation', () => {
  // The regression gate. A failure here is not necessarily a bug — it means
  // detector behaviour moved. Read the diff, decide whether the move was
  // intended, then re-record with `npm run benchmark -- --update-baseline`.
  const report = runBenchmark(SHIPPING_CONFIG);
  const committed = JSON.parse(
    readFileSync(join(HERE, '..', 'benchmark', 'baselines', 'yin-11k-w512.json'), 'utf8')
  );
  const drift = diffBaseline(committed, toBaseline(report));
  assert.deepEqual(drift, [], `baseline drift:\n${drift.map((d) => `  ${d}`).join('\n')}`);
});
