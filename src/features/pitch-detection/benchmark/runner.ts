/**
 * Drives a detector configuration over the corpus and assembles the report.
 *
 * The whole harness is deterministic apart from one field: `processingMs`
 * depends on the machine and on what else it is doing. That number is reported
 * because CPU cost is a real constraint on a phone, but it is deliberately kept
 * out of every accuracy budget, and the baseline comparison ignores it. A
 * benchmark that fails because a laptop was busy teaches people to ignore
 * benchmarks.
 */
import { createPitchSmoother } from '../lib/experimental/pitchSmoother';
import { BANDS, bandById } from './bands';
import { BREATHY_REFERENCE_CASES, MUSIC_REFERENCE_CASE, VOICE_REFERENCE_CASE, buildCorpus } from './corpus';
import { detectorFor } from './detectors';
import {
  accuracyMetrics,
  clarityGateAnalysis,
  confidenceMetrics,
  distribution,
  findOutliers,
  measureSettling,
  octaveMetrics,
  rocAuc,
  stabilityMetrics,
  voicingMetrics,
} from './metrics';
import { bandCoverage } from './realCorpus';
import type {
  BandMetrics,
  BenchmarkCase,
  BenchmarkReport,
  CaseResult,
  DetectorConfig,
  FrameObservation,
  RealCorpusMetrics,
  SettlingMeasurement,
  StabilityMetrics,
} from './types';

/**
 * A recording declared `sustained` whose measured steady share falls below this
 * is flagged: the take moves more than intended. Not an error — its frames
 * still count for tracking — but it should be re-recorded before being relied
 * on for accuracy.
 */
const MISLABEL_STEADY_SHARE = 0.5;

const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);
const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export interface CaseRun {
  result: CaseResult;
  observations: FrameObservation[];
}

/**
 * Run one case, frame by frame, exactly as the engine would slide its window.
 *
 * The stabilizer, when configured, is fed only voiced frames and is reset
 * between cases — mirroring how a session hook uses it, since each case stands
 * for one independent take.
 */
export function runCase(config: DetectorConfig, testCase: BenchmarkCase): CaseRun {
  const detector = detectorFor(config);
  const { windowSamples, hopSamples, analysisRateHz } = config;
  const smoother = config.stabilizer === 'median3-ema' ? createPitchSmoother() : null;
  smoother?.reset();

  const observations: FrameObservation[] = [];
  let index = 0;

  for (let start = 0; start + windowSamples <= testCase.signal.length; start += hopSamples, index++) {
    const end = start + windowSamples;
    const window = testCase.signal.subarray(start, end);

    const startedAt = performance.now();
    const reading = detector.analyze(window, analysisRateHz);
    const processingMs = performance.now() - startedAt;

    const truth = testCase.reference(start, end);
    const stable =
      reading.frequency === null
        ? null
        : smoother
          ? midiToHz(smoother.push(hzToMidi(reading.frequency)))
          : reading.frequency;

    observations.push({
      index,
      startSample: start,
      // the window's own midpoint: the instant the reading is about
      timeSec: (start + windowSamples / 2) / analysisRateHz,
      // the window's end: the earliest this reading could exist
      availableSec: end / analysisRateHz,
      expectedHz: truth === 'excluded' ? undefined : truth,
      scored: truth !== 'excluded',
      frequency: reading.frequency,
      stableFrequency: stable,
      clarity: reading.clarity,
      rms: reading.rms,
      processingMs,
    });
  }

  const useStable = config.stabilizer !== 'none';
  const settling: SettlingMeasurement[] = (testCase.steps ?? []).map((step) =>
    measureSettling(observations, step, analysisRateHz, useStable)
  );

  const excludedFrames = observations.filter((o) => !o.scored).length;

  const result: CaseResult = {
    caseId: testCase.id,
    label: testCase.label,
    group: testCase.group,
    corpusKind: testCase.corpusKind ?? 'synthetic',
    bandId: testCase.bandId,
    frames: observations.length,
    excludedFrames,
    excludedRate: observations.length ? excludedFrames / observations.length : 0,
    trustedAnnotation: testCase.trustedAnnotation,
    accuracy: accuracyMetrics(observations, useStable),
    octave: octaveMetrics(observations, useStable),
    voicing: voicingMetrics(observations),
    stability: testCase.expectPitchMovement ? null : stabilityMetrics(observations, useStable),
    confidence: confidenceMetrics(observations),
    settling,
    expectOctaveFailure: testCase.expectOctaveFailure === true,
    expectPitchMovement: testCase.expectPitchMovement === true,
  };

  return { result, observations };
}

/**
 * Average per-case stability rather than pooling frames.
 *
 * Pooling would place the last frame of one case next to the first frame of the
 * next and count the difference as a frame-to-frame jump the detector never
 * made. Jitter and flicker are properties of a continuous take, so they are
 * measured per take and then summarized.
 */
function aggregateStability(results: CaseResult[]): StabilityMetrics | null {
  const parts = results.map((r) => r.stability).filter((s): s is StabilityMetrics => s !== null);
  if (parts.length === 0) return null;
  return {
    jitterCents: parts.reduce((a, s) => a + s.jitterCents, 0) / parts.length,
    maxFrameDeltaCents: Math.max(...parts.map((s) => s.maxFrameDeltaCents)),
    noteFlipsPerSec: parts.reduce((a, s) => a + s.noteFlipsPerSec, 0) / parts.length,
  };
}

/**
 * Aggregate real-corpus frames by the band of each frame's *expected* pitch.
 *
 * A recording of a scale crosses three bands; banding it by, say, its highest
 * note would credit or blame the wrong range for most of its frames. Grouping
 * by expected pitch puts every frame in the band it actually belongs to, at the
 * cost of a second aggregation path — the synthetic one stays case-level, since
 * a synthetic case holds one pitch by construction.
 */
function aggregateRealBands(observations: FrameObservation[], useStable: boolean): BandMetrics[] {
  const out: BandMetrics[] = [];
  for (const band of BANDS) {
    const inBand = observations.filter(
      (o) => typeof o.expectedHz === 'number' && o.expectedHz >= band.minHz && o.expectedHz < band.maxHz
    );
    if (inBand.length === 0) continue;
    out.push({
      bandId: band.id,
      label: band.label,
      minHz: band.minHz,
      maxHz: band.maxHz,
      cases: inBand.length, // frames, for real material
      accuracy: accuracyMetrics(inBand, useStable),
      octave: octaveMetrics(inBand, useStable),
      voicing: voicingMetrics(inBand),
      // jitter and flicker need a continuous take, which a band-filtered
      // subset is not — measured per recording instead, in the case results
      stability: null,
    });
  }
  return out;
}

export interface RunOptions {
  /** override the corpus, e.g. to measure one group while iterating */
  corpus?: BenchmarkCase[];
  /**
   * Real recordings to measure alongside the synthetic corpus. Loaded by the
   * caller (`realCorpusLoader`) so this module keeps no filesystem dependency.
   */
  realCases?: BenchmarkCase[];
}

export function runBenchmark(config: DetectorConfig, options: RunOptions = {}): BenchmarkReport {
  const corpus = options.corpus ?? buildCorpus(config.analysisRateHz);
  const realCases = options.realCases ?? [];
  const useStable = config.stabilizer !== 'none';

  const runs = corpus.map((c) => ({ testCase: c, run: runCase(config, c) }));
  const results = runs.map((r) => r.run.result);
  const allObservations = runs.flatMap((r) => r.run.observations);

  const realRuns = realCases.map((c) => ({ testCase: c, run: runCase(config, c) }));
  const realObservations = realRuns.flatMap((r) => r.run.observations);

  /* -- per band ------------------------------------------------------ */
  const bands: BandMetrics[] = [];
  for (const band of BANDS) {
    const inBand = runs.filter((r) => r.testCase.bandId === band.id);
    if (inBand.length === 0) continue;

    /**
     * Two exclusions, both about what a band average is *for*: it answers
     * "how well does the detector work on singing in this range", so material
     * that is not that must not be averaged into it.
     *
     * - `expectPitchMovement` — vibrato and pitch steps are supposed to move,
     *   and their deviation is the signal, not the error.
     * - the `confidence` group — those cases are built to sit at and past the
     *   edge of usability (80% noise, a polyphonic mix) in order to probe the
     *   confidence measure. Measured: the 80%-noise case alone moved the core
     *   band from 0 to 1.7% octave errors and its jitter from ~1¢ to 9¢, which
     *   would have described the core of a singer's range by a signal no
     *   singer produces. They are measured on their own terms in the
     *   confidence section, and any octave error they cause is still named
     *   individually in `outliers` — excluded from the average, not hidden.
     */
    const steady = inBand.filter(
      (r) => !r.testCase.expectPitchMovement && r.testCase.group !== 'confidence'
    );
    const observations = steady.flatMap((r) => r.run.observations);
    if (steady.length === 0) continue;

    bands.push({
      bandId: band.id,
      label: band.label,
      minHz: band.minHz,
      maxHz: band.maxHz,
      cases: inBand.length,
      accuracy: accuracyMetrics(observations, useStable),
      octave: octaveMetrics(observations, useStable),
      voicing: voicingMetrics(observations),
      stability: aggregateStability(steady.map((r) => r.run.result)),
    });
  }

  /* -- latency ------------------------------------------------------- */
  const windowMs = (config.windowSamples / config.analysisRateHz) * 1000;
  const hopMs = (config.hopSamples / config.analysisRateHz) * 1000;
  const processing = distribution(allObservations.map((o) => o.processingMs));
  const settling = results.flatMap((r) => r.settling);
  const settled = settling.map((s) => s.settlingMs).filter((ms): ms is number => ms !== null);

  /* -- confidence ---------------------------------------------------- */
  const clarityOf = (caseIds: string[]): number[] =>
    runs
      .filter((r) => caseIds.includes(r.testCase.id))
      .flatMap((r) => r.run.observations)
      .filter((o) => o.frequency !== null)
      .map((o) => o.clarity);

  const voiceClarity = clarityOf([VOICE_REFERENCE_CASE]);
  const musicClarity = clarityOf([MUSIC_REFERENCE_CASE]);
  const breathyClarity = clarityOf(BREATHY_REFERENCE_CASES);

  return {
    config,
    corpus: {
      cases: corpus.length,
      frames: allObservations.length,
      scoredFrames: allObservations.filter((o) => o.scored && typeof o.expectedHz === 'number').length,
    },
    bands,
    latency: {
      windowMs,
      hopMs,
      analyticFloorMs: windowMs + hopMs,
      processingMs: processing,
      realTimeFactor: processing.mean / hopMs,
      settling,
      medianSettlingMs: settled.length
        ? [...settled].sort((a, b) => a - b)[Math.floor(settled.length / 2)]
        : null,
    },
    real: realRuns.length === 0 ? null : buildRealMetrics(realRuns, realObservations, useStable, config),
    confidence: confidenceMetrics(allObservations),
    voiceVsMusicAuc: rocAuc(voiceClarity, musicClarity),
    clarityGate: clarityGateAnalysis(voiceClarity, breathyClarity, musicClarity),
    outliers: findOutliers([...results, ...realRuns.map((r) => r.run.result)]),
    cases: [...results, ...realRuns.map((r) => r.run.result)],
  };
}

function buildRealMetrics(
  realRuns: { testCase: BenchmarkCase; run: CaseRun }[],
  observations: FrameObservation[],
  useStable: boolean,
  config: DetectorConfig
): RealCorpusMetrics {
  /**
   * The accuracy subset: sustained frames of recordings *declared* sustained.
   *
   * Two gates, and both are needed. The declaration alone is intent, and a
   * singer who meant to hold a straight note often did not. The measurement
   * alone would let expressive material contribute whatever fraction of it
   * happened to sit still — which is precisely the biased subset the annotator
   * smoothed most. Requiring both means an accuracy figure comes only from
   * material recorded for the purpose *and* measuring as still.
   *
   * Re-asking each case's stricter reference about the window an observation
   * came from keeps the split inside the corpus's own annotation, rather than
   * inferring it from what the detector reported — which would let a wandering
   * detector define its own easy subset.
   */
  const isSustainedFrame = (testCase: BenchmarkCase, o: FrameObservation) =>
    testCase.steadyReference !== undefined &&
    typeof testCase.steadyReference(o.startSample, o.startSample + config.windowSamples) === 'number';

  const sustainedRuns = realRuns.filter((r) => r.testCase.recording?.category === 'sustained');
  const steadyObservations = sustainedRuns.flatMap((r) =>
    r.run.observations.filter((o) => isSustainedFrame(r.testCase, o))
  );

  /**
   * Recordings declared sustained that did not measure that way — the take has
   * more movement in it than the recordist intended. Named individually,
   * because the fix is to re-record rather than to loosen anything.
   */
  const mislabelled = sustainedRuns
    .map((r) => {
      const scored = r.run.observations.filter((o) => o.scored && typeof o.expectedHz === 'number').length;
      const steady = r.run.observations.filter((o) => isSustainedFrame(r.testCase, o)).length;
      return { caseId: r.testCase.id, steadyShare: scored ? steady / scored : 0 };
    })
    .filter((r) => r.steadyShare < MISLABEL_STEADY_SHARE);

  const recordings = realRuns
    .map((r) => r.testCase.recording)
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  const excluded = observations.filter((o) => !o.scored).length;
  const errorFloors = recordings
    .map((r) => r.annotation.annotatorErrorCents)
    .filter((c): c is number => typeof c === 'number');

  return {
    recordings: realRuns.length,
    trustedRecordings: realRuns.filter((r) => r.testCase.trustedAnnotation).length,
    frames: observations.length,
    scoredFrames: observations.filter((o) => o.scored && typeof o.expectedHz === 'number').length,
    excludedRate: observations.length ? excluded / observations.length : 0,
    bands: aggregateRealBands(observations, useStable),
    steadyBands: aggregateRealBands(steadyObservations, useStable),
    steadyFrames: steadyObservations.length,
    sustainedRecordings: sustainedRuns.length,
    mislabelled,
    confidence: confidenceMetrics(observations),
    bandCoverage: bandCoverage(recordings),
    annotatorErrorFloorCents: errorFloors.length ? Math.min(...errorFloors) : null,
  };
}

/** Band definition lookup, re-exported so report consumers need one import. */
export { bandById };
