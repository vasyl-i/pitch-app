/**
 * Tests for the real-vocal corpus path: WAV decoding, the decimation replica,
 * reference pitch from an automatic annotation, and the loader's refusals.
 *
 * The end-to-end test builds a recording whose true pitch is known by
 * construction, writes it to disk as a real corpus entry, and runs the whole
 * loader → decimate → detect → score path over it. That is the only way to know
 * the path measures what it claims: every other test here checks one link.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SHIPPING_CONFIG } from '../benchmark/detectors';
import { decimate, decimateChunked, extractFirBlock, normalizeSource } from '../benchmark/decimate';
import { decodeWav, encodeWav } from '../benchmark/wav';
import {
  TRANSITION_SPREAD_CENTS,
  bandCoverage,
  annotationReference,
  steadyAnnotationReference,
  validateRecording,
  type RealRecording,
} from '../benchmark/realCorpus';
import { loadRealCorpus } from '../benchmark/realCorpusLoader';
import { runBenchmark } from '../benchmark/runner';
import { tone } from '../benchmark/signals';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURE_RATE = 44100;

/* ------------------------------------------------------------------ *
 * WAV                                                                 *
 * ------------------------------------------------------------------ */

test('WAV round-trips through the encoder and decoder', () => {
  const original = tone(220, 4410, CAPTURE_RATE, { harmonics: 6 });
  const decoded = decodeWav(encodeWav(original, CAPTURE_RATE));

  assert.equal(decoded.sampleRateHz, CAPTURE_RATE);
  assert.equal(decoded.channels, 1);
  assert.equal(decoded.bitsPerSample, 16);
  assert.equal(decoded.samples.length, original.length);
  // 16-bit quantization is the only loss permitted
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(decoded.samples[i] - original[i]) < 1 / 32000, `sample ${i} drifted`);
  }
});

test('a malformed file is refused, not silently read as silence', () => {
  assert.throws(() => decodeWav(new ArrayBuffer(8)), /RIFF/);
  const notWave = new Uint8Array(encodeWav(new Float32Array(16), 44100));
  notWave[9] = 0x00; // corrupt "WAVE"
  assert.throws(() => decodeWav(notWave.buffer as ArrayBuffer), /RIFF/);
});

/* ------------------------------------------------------------------ *
 * Decimation                                                          *
 * ------------------------------------------------------------------ */

test('the decimation replica still matches pitchEngine character for character', () => {
  // If this fails, the engine's filter changed and every real-corpus number
  // was produced by a filter the app no longer uses. Copy the new block into
  // benchmark/decimate.ts and re-record the baselines.
  const engine = extractFirBlock(readFileSync(join(HERE, '..', 'lib', 'pitchEngine.ts'), 'utf8'));
  const replica = extractFirBlock(readFileSync(join(HERE, '..', 'benchmark', 'decimate.ts'), 'utf8'));

  assert.ok(engine !== null, 'could not find FIR_TAPS in pitchEngine.ts');
  assert.ok(replica !== null, 'could not find FIR_TAPS in decimate.ts');
  assert.equal(normalizeSource(replica), normalizeSource(engine));
});

test('offline decimation equals the engine’s chunked callback path', () => {
  // The engine filters in ~512-sample callbacks with a carried tail. Offline
  // replay does it in one pass. These must agree, or measurements taken offline
  // describe a different signal than the one the app analyzes.
  const signal = tone(196, 44100, CAPTURE_RATE, { harmonics: 10, noiseLevel: 0.05 });
  const whole = decimate(signal);
  const chunked = decimateChunked(signal, 512);

  assert.ok(whole.length > 0);
  assert.equal(chunked.length, whole.length);
  for (let i = 0; i < whole.length; i++) {
    assert.ok(Math.abs(chunked[i] - whole[i]) < 1e-6, `sample ${i}: ${chunked[i]} vs ${whole[i]}`);
  }
});

/* ------------------------------------------------------------------ *
 * Reference pitch from an annotation                                       *
 * ------------------------------------------------------------------ */

const ANALYSIS_RATE = 11025;

function annotationOf(f0Hz: (number | null)[], hopSec = 0.01) {
  return { method: 'manual' as const, verified: true, hopSec, f0Hz };
}

test('a steady annotated stretch yields its median pitch', () => {
  const truth = annotationReference(annotationOf(new Array(200).fill(440)), ANALYSIS_RATE);
  assert.equal(truth(0, 512), 440);
});

test('windows the annotation cannot speak for are excluded, not guessed', () => {
  const hop = 0.01;
  const framesPerWindow = Math.ceil(512 / ANALYSIS_RATE / hop); // ~5 annotation frames

  // half voiced, half silent — an onset
  const onset = [...new Array(3).fill(null), ...new Array(197).fill(440)];
  assert.equal(annotationReference(annotationOf(onset, hop), ANALYSIS_RATE)(0, 512), 'excluded');

  // a full semitone of movement inside one window — a transition
  const sliding = new Array(200).fill(0).map((_, i) => 440 * Math.pow(2, i / 12));
  assert.equal(annotationReference(annotationOf(sliding, hop), ANALYSIS_RATE)(0, 512), 'excluded');
  assert.ok(framesPerWindow > 1, 'the window must span several annotation frames for this to be meaningful');

  // entirely unvoiced — expect no pitch, which is a scored expectation
  assert.equal(annotationReference(annotationOf(new Array(200).fill(null), hop), ANALYSIS_RATE)(0, 512), null);

  // past the end of the annotation
  assert.equal(annotationReference(annotationOf([440, 440], hop), ANALYSIS_RATE)(ANALYSIS_RATE, ANALYSIS_RATE + 512), 'excluded');
});

test('vibrato stays inside the measurement rather than being excluded', () => {
  // vibrato is pitch movement the detector must track, not an excuse; a ±30¢
  // swing must remain scored while a semitone transition does not
  const swing = new Array(200).fill(0).map((_, i) => 440 * Math.pow(2, (30 * Math.sin(i / 3)) / 1200));
  const result = annotationReference(annotationOf(swing), ANALYSIS_RATE)(0, 512);
  assert.equal(typeof result, 'number', `±30¢ vibrato must stay scored, got ${String(result)}`);
  assert.ok(TRANSITION_SPREAD_CENTS >= 100, 'the exclusion threshold must stay above vibrato extent');
});

test('the sustained filter looks at a neighbourhood, not just the window', () => {
  const hop = 0.01;
  const analysisWindow = 512;

  // flat throughout — sustained
  const flat = steadyAnnotationReference(annotationOf(new Array(400).fill(440), hop), ANALYSIS_RATE);
  assert.equal(typeof flat(ANALYSIS_RATE, ANALYSIS_RATE + analysisWindow), 'number');

  // The window itself is flat, but the note changes 100ms later. A
  // window-local test would accept this; that is the failure mode the
  // neighbourhood test exists to catch.
  const movesNearby = new Array(400).fill(0).map((_, i) => (i < 105 ? 440 : 466.16));
  const near = steadyAnnotationReference(annotationOf(movesNearby, hop), ANALYSIS_RATE);
  const windowStart = Math.round(0.9 * ANALYSIS_RATE);
  assert.equal(typeof annotationReference(annotationOf(movesNearby, hop), ANALYSIS_RATE)(windowStart, windowStart + analysisWindow), 'number');
  assert.equal(near(windowStart, windowStart + analysisWindow), 'excluded');
});

test('real vibrato leaves too little sustained material to score', () => {
  // A filter cannot rescue a cents number from vibrato'd material, because it
  // must consult the annotation and the annotation smooths movement. The corpus
  // protocol asks for straight sustained notes instead; this pins the shortfall
  // so the protocol keeps its reason.
  //
  // ±40¢ — 80¢ peak to peak — is what real vibrato measures, and what the
  // synthetic corpus generates. An earlier version of this test used ±7¢ on the
  // belief that even that shallow a movement cost 3.5¢ of disagreement. That
  // belief came from annotations quantized to a 10-cent grid; re-measured with
  // a 5-cent grid the same phrase costs 1.27¢, and error is flat across every
  // spread bin up to 20¢. Shallow drift is now legitimately scored, which is
  // why STEADY_SPREAD_CENTS is 12 rather than 2.
  const hop = 0.01;
  const vibrato = new Array(400).fill(0).map((_, i) => 440 * Math.pow(2, (40 * Math.sin((2 * Math.PI * 5.2 * i * hop))) / 1200));
  const truth = steadyAnnotationReference(annotationOf(vibrato, hop), ANALYSIS_RATE);

  let scored = 0;
  let total = 0;
  for (let start = 0; start + 512 < 3 * ANALYSIS_RATE; start += 128) {
    total++;
    if (typeof truth(start, start + 512) === 'number') scored++;
  }
  assert.ok(total > 50);
  assert.ok(scored / total < 0.5, `${((scored / total) * 100).toFixed(0)}% survived; vibrato must not read as sustained`);
});

/* ------------------------------------------------------------------ *
 * Validation and coverage                                             *
 * ------------------------------------------------------------------ */

test('a recording without provenance is rejected', () => {
  const problems = validateRecording({
    id: 'x',
    category: 'sustained',
    sampleRateHz: 44100,
    annotation: annotationOf([440]),
  } as Partial<RealRecording>);
  assert.deepEqual(problems, ['missing provenance.source', 'missing provenance.license', 'missing provenance.consent']);
});

test('a recording must declare what it is for', () => {
  // Category decides whether a recording may contribute to an accuracy figure,
  // so an absent or invented one is a rejection rather than a default.
  const base = {
    id: 'x',
    sampleRateHz: 44100,
    provenance: { source: 's', license: 'l', consent: 'c' },
    annotation: annotationOf([440]),
  };
  assert.deepEqual(validateRecording(base as Partial<RealRecording>), [
    'category must be one of: sustained, expressive',
  ]);
  assert.deepEqual(
    validateRecording({ ...base, category: 'whatever' } as unknown as Partial<RealRecording>),
    ['category must be one of: sustained, expressive']
  );
  assert.deepEqual(validateRecording({ ...base, category: 'expressive' } as Partial<RealRecording>), []);
});

test('expressive recordings never contribute to the accuracy figure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
  try {
    // A perfectly steady tone, but declared expressive: it must be measured for
    // tracking and must still leave the accuracy table empty. The declaration
    // governs, not the measurement — otherwise expressive material would
    // contribute whatever fraction of it happened to sit still.
    const samples = tone(220, CAPTURE_RATE * 2, CAPTURE_RATE, { harmonics: 12, noiseLevel: 0.03 });
    writeRecording(dir, 'phrase', samples, {
      category: 'expressive',
      annotation: { method: 'manual', verified: true, hopSec: 0.01, f0Hz: new Array(200).fill(220) },
    });

    const loaded = loadRealCorpus(dir, SHIPPING_CONFIG);
    const report = runBenchmark(SHIPPING_CONFIG, { realCases: loaded.cases });

    assert.ok(report.real !== null);
    assert.equal(report.real.recordings, 1);
    assert.equal(report.real.sustainedRecordings, 0);
    assert.equal(report.real.steadyFrames, 0, 'expressive material must not reach the accuracy subset');
    assert.deepEqual(report.real.steadyBands, []);
    // …while still being measured for tracking
    assert.ok(report.real.bands.length > 0, 'expressive material must still be measured for tracking');
    assert.equal(report.real.bands[0].octave?.errorRate, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validation reports every problem at once', () => {
  const problems = validateRecording({} as Partial<RealRecording>);
  assert.ok(problems.length >= 5, `expected several problems, got ${problems.join(', ')}`);
  assert.ok(problems.includes('missing id'));
  assert.ok(problems.includes('missing annotation'));
});

test('band coverage counts annotated frames per operating range', () => {
  const recording = {
    annotation: annotationOf([100, 100, 200, 200, 200, null, 800]),
  } as RealRecording;
  assert.deepEqual(bandCoverage([recording]), { low: 2, mid: 3, high: 1 });
});

/* ------------------------------------------------------------------ *
 * Loader                                                              *
 * ------------------------------------------------------------------ */

function writeRecording(
  dir: string,
  id: string,
  samples: Float32Array,
  meta: Partial<RealRecording>,
  sampleRateHz = CAPTURE_RATE
): void {
  writeFileSync(join(dir, `${id}.wav`), Buffer.from(encodeWav(samples, sampleRateHz)));
  writeFileSync(
    join(dir, `${id}.json`),
    JSON.stringify({
      id,
      label: id,
      category: 'sustained',
      provenance: { source: 'test', license: 'test', consent: 'test' },
      conditions: {},
      sampleRateHz,
      annotation: annotationOf(new Array(Math.ceil((samples.length / sampleRateHz) * 100)).fill(220)),
      ...meta,
    })
  );
}

test('an absent corpus directory is normal, not an error', () => {
  const loaded = loadRealCorpus(join(tmpdir(), 'definitely-not-here-9f3a'), SHIPPING_CONFIG);
  assert.deepEqual(loaded.cases, []);
  assert.deepEqual(loaded.rejected, []);
});

test('the loader refuses what it cannot trust, with a reason', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
  try {
    const samples = tone(220, CAPTURE_RATE, CAPTURE_RATE, { harmonics: 8 });

    // wrong sample rate for the configuration
    writeRecording(dir, 'wrong-rate', samples, {}, 22050);
    // no metadata alongside
    writeFileSync(join(dir, 'orphan.wav'), Buffer.from(encodeWav(samples, CAPTURE_RATE)));
    // annotation far too short for the audio
    writeRecording(dir, 'short-annotation', samples, { annotation: annotationOf([220, 220]) });
    // one good recording, so the others are shown to be rejected individually
    writeRecording(dir, 'good', samples, {});

    const loaded = loadRealCorpus(dir, SHIPPING_CONFIG);
    const reasons = Object.fromEntries(loaded.rejected.map((r) => [r.file, r.reason]));

    assert.equal(loaded.cases.length, 1, 'the valid recording must still load');
    assert.equal(loaded.cases[0].id, 'real-good');
    assert.match(reasons['wrong-rate.wav'], /sample rate/);
    assert.match(reasons['orphan.wav'], /no orphan\.json/);
    assert.match(reasons['short-annotation.wav'], /annotation covers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recordings load in a stable order regardless of filesystem order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
  try {
    const samples = tone(220, CAPTURE_RATE, CAPTURE_RATE, { harmonics: 8 });
    for (const id of ['zulu', 'alpha', 'mike']) writeRecording(dir, id, samples, {});
    assert.ok(readdirSync(dir).length > 0);

    const ids = loadRealCorpus(dir, SHIPPING_CONFIG).cases.map((c) => c.id);
    assert.deepEqual(ids, ['real-alpha', 'real-mike', 'real-zulu']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ *
 * End to end                                                          *
 * ------------------------------------------------------------------ */

test('a recording with an exact reference measures as accurate through the whole path', () => {
  // The signal is synthesized, so its f0 is known rather than estimated: this
  // isolates the *path* — WAV decode, decimation, framing, contour lookup —
  // from the annotator error a real pYIN-labelled recording would also carry.
  const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
  try {
    const hz = 220;
    const seconds = 2;
    const samples = tone(hz, CAPTURE_RATE * seconds, CAPTURE_RATE, { harmonics: 12, rolloff: 0.65, noiseLevel: 0.03 });
    writeRecording(dir, 'exact', samples, {
      annotation: {
        method: 'synthesized-source',
        verified: true,
        hopSec: 0.01,
        f0Hz: new Array(seconds * 100).fill(hz),
        annotatorErrorCents: 0,
      },
    });

    const loaded = loadRealCorpus(dir, SHIPPING_CONFIG);
    assert.equal(loaded.cases.length, 1);
    assert.equal(loaded.cases[0].trustedAnnotation, true);

    const report = runBenchmark(SHIPPING_CONFIG, { realCases: loaded.cases });
    assert.ok(report.real !== null);
    assert.equal(report.real.recordings, 1);
    assert.equal(report.real.trustedRecordings, 1);
    assert.equal(report.real.annotatorErrorFloorCents, 0);

    const mid = report.real.bands.find((b) => b.bandId === 'mid');
    assert.ok(mid !== undefined, 'a 220Hz recording belongs to the core band');
    assert.ok(mid.accuracy !== null);
    // through decimation and back, with exact truth, the detector must still
    // land inside the band's synthetic budget
    assert.ok(
      mid.accuracy.absCents.median < 1,
      `median ${mid.accuracy.absCents.median.toFixed(2)}¢ — the path itself is adding error`
    );
    assert.equal(mid.octave?.errorRate, 0);
    assert.ok(report.real.excludedRate < 0.05, `${(report.real.excludedRate * 100).toFixed(1)}% excluded on steady material`);

    // and the synthetic side is untouched by the presence of a real corpus
    assert.equal(report.bands.find((b) => b.bandId === 'mid')?.cases, 32);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
