/**
 * Contracts for the pitch-detection benchmark.
 *
 * The point of these types is to make a measurement *portable across
 * detectors*: a result carries the configuration that produced it, so a number
 * can never be quoted without the conditions it was measured under. The
 * engineering spec asks for accuracy, octave error and latency to be stated per
 * operating range and per detector configuration rather than as global
 * constants, and that requirement lives here as structure — a `BandMetrics`
 * cannot exist without a band, and a `BenchmarkReport` cannot exist without a
 * `DetectorConfig`.
 *
 * Nothing in this folder imports from the DSP pipeline except the detector
 * adapter, and nothing in the pipeline imports from here. The harness observes;
 * it does not participate.
 */
// type-only, and erased at runtime — `realCorpus` imports this module back
import type { RealRecording } from './realCorpus';

/* ------------------------------------------------------------------ *
 * Detector under test                                                 *
 * ------------------------------------------------------------------ */

/**
 * Everything about how a detector is being run that could move a number.
 *
 * Recorded verbatim into every report, because "±5 cents" is meaningless
 * without it: the same YIN code measures ~0.6¢ at C4 and ~12.7¢ at B5, and
 * changing `analysisRateHz` alone moves the octave-error ceiling by an octave.
 */
export interface DetectorConfig {
  id: string;
  label: string;
  /** rate the detector actually sees, after any decimation */
  analysisRateHz: number;
  /** analysis window, in samples at `analysisRateHz` */
  windowSamples: number;
  /** frame advance, in samples at `analysisRateHz` */
  hopSamples: number;
  /** rate the microphone is captured at, before decimation */
  captureRateHz: number;
  /** decimation factor between capture and analysis */
  decimation: number;
  /**
   * Post-detector conditioning under test. `'none'` measures the raw detector,
   * which is what the app now scores from; `'median3-ema'` runs the retired
   * smoother (`lib/experimental/pitchSmoother`) so the comparison that retired
   * it stays reproducible.
   */
  stabilizer: 'none' | 'median3-ema';
  /** true for the configuration the app actually ships today */
  shipping: boolean;
  /** why this configuration is in the registry */
  note: string;
}

export interface DetectorReading {
  frequency: number | null;
  clarity: number;
  rms: number;
}

/**
 * The seam the benchmark measures through.
 *
 * Deliberately narrower than anything in the pipeline: one window in, one
 * reading out. Any future detector (pYIN, MPM, SWIPE, a neural post-processor)
 * becomes comparable by implementing this and nothing else — which is also the
 * shape the eventual `PitchDetector` interface should take when the pipeline is
 * refactored.
 */
export interface BenchmarkDetector {
  config: DetectorConfig;
  analyze(window: Float32Array, sampleRate: number): DetectorReading;
}

/* ------------------------------------------------------------------ *
 * Corpus                                                              *
 * ------------------------------------------------------------------ */

/**
 * What the signal is doing over the span a single analysis window covers.
 *
 * `'excluded'` is the important case: a window straddling a note boundary
 * contains two pitches, so neither answer is right and scoring it would
 * manufacture errors the detector did not make. Transitions are measured
 * separately, by the settling metric, where they are the subject rather than
 * contamination.
 */
export type PitchReference = (startSample: number, endSample: number) => number | null | 'excluded';

export type CaseGroup =
  | 'accuracy'
  | 'octave'
  | 'voicing'
  | 'stability'
  | 'confidence'
  | 'latency'
  | 'material';

/** A pitch change at a known instant, for response-latency measurement. */
export interface StepEvent {
  atSample: number;
  fromHz: number;
  toHz: number;
}

export type CorpusKind = 'synthetic' | 'real';

export interface BenchmarkCase {
  id: string;
  label: string;
  group: CaseGroup;
  /** defaults to 'synthetic'; the two corpora are never pooled into one number */
  corpusKind?: CorpusKind;
  signal: Float32Array;
  reference: PitchReference;
  /**
   * Operating-range band, for banded budgets. Synthetic cases hold one pitch
   * and can be banded whole. Real recordings move through the range, so they
   * leave this unset and are banded per frame by expected pitch instead.
   */
  bandId?: string;
  /**
   * Real cases only: whether the annotation is reference-grade (EGG, a
   * re-captured synthesized source, or human-verified) rather than another
   * pitch detector's unchecked opinion. Untrusted material is measured and
   * reported, never pooled with trusted material.
   */
  trustedAnnotation?: boolean;
  /**
   * Real cases only: a stricter reference that scores *only* sustained
   * windows. Cents accuracy against a contour annotation is meaningful on
   * sustained material and misleading on moving material — see
   * `STEADY_SPREAD_CENTS` for the measurement behind that.
   */
  steadyReference?: PitchReference;
  /** real cases only: the recording's metadata, for provenance reporting */
  recording?: RealRecording;
  /** the case is expected to yield no pitch at all (silence, whisper, noise) */
  expectUnvoiced?: boolean;
  /**
   * The case is expected to *fail* — a documented limit being pinned rather
   * than a target being met. Above `MAX_RELIABLE_F0` the detector reports
   * exactly one octave low, and the benchmark asserts that it still does, so
   * that fixing it forces the declared range to be updated with it.
   */
  expectOctaveFailure?: boolean;
  /** excluded from jitter budgets: the pitch is *supposed* to move */
  expectPitchMovement?: boolean;
  steps?: StepEvent[];
}

/* ------------------------------------------------------------------ *
 * Per-frame observation                                               *
 * ------------------------------------------------------------------ */

export interface FrameObservation {
  index: number;
  startSample: number;
  /**
   * The instant this reading is *about* — the window's midpoint. Use for
   * ordering and for pairing a reading with what the singer was doing.
   */
  timeSec: number;
  /**
   * The instant this reading could first *exist* — the window's end. Use for
   * anything latency-shaped: the app cannot know about audio it has not
   * received yet, and timing a response from the midpoint would credit the
   * detector with half a window of clairvoyance.
   */
  availableSec: number;
  /** null = silence expected here; undefined = window straddles a transition */
  expectedHz: number | null | undefined;
  scored: boolean;
  frequency: number | null;
  /** after the configured stabilizer; equals `frequency` when there is none */
  stableFrequency: number | null;
  clarity: number;
  rms: number;
  /** wall-clock cost of this one `analyze` call — environment-dependent */
  processingMs: number;
}

/* ------------------------------------------------------------------ *
 * Metrics                                                             *
 * ------------------------------------------------------------------ */

/** Distribution of a measured quantity. Percentiles, not just a mean. */
export interface Distribution {
  count: number;
  mean: number;
  median: number;
  p95: number;
  max: number;
}

export interface AccuracyMetrics {
  /** frames with a usable reference pitch */
  scoredFrames: number;
  /** absolute cents error, octave-folded so octave errors don't swamp tuning */
  absCents: Distribution;
  /** mean *signed* cents error: a persistent detector bias, if any */
  biasCents: number;
  /** fraction of scored frames within a tolerance, keyed by cents */
  withinCents: Record<number, number>;
}

export interface OctaveMetrics {
  scoredFrames: number;
  errorRate: number;
  /** locked onto a sub-harmonic — reports too low */
  low: number;
  /** locked onto a harmonic — reports too high */
  high: number;
}

export interface VoicingMetrics {
  frames: number;
  /** frames the detector returned a pitch for */
  detected: number;
  /** voiced material the detector missed, 0..1 */
  lostVoiceRate: number;
  /** unvoiced material the detector invented a pitch for, 0..1 */
  falsePitchRate: number;
}

export interface StabilityMetrics {
  /** stdev of cents error around its own mean — jitter with accuracy removed */
  jitterCents: number;
  /** largest frame-to-frame pitch move */
  maxFrameDeltaCents: number;
  /**
   * Times per second the *rounded* note changes on steady material. The metric
   * the spec's quality philosophy actually cares about: a detector can be
   * accurate to a fraction of a cent and still flicker a note display between
   * two names, which harms the singer more than the error it fixed.
   */
  noteFlipsPerSec: number;
}

/**
 * What a confidence *threshold* would actually cost.
 *
 * An AUC can be 1.0 — perfect ranking — while every usable threshold is still
 * useless, because the two populations sit at 0.998 and 0.98 with genuine
 * breathy singing far below both. Ranking separability and threshold
 * separability are different questions, and the second one is what a gate in
 * the app depends on. This measures it directly: pick the threshold that
 * rejects all backing-track frames, then report how much real singing it takes
 * with it.
 */
export interface ClarityGateAnalysis {
  voiceClarityMedian: number | null;
  breathyClarityMedian: number | null;
  musicClarityMedian: number | null;
  /** the lowest threshold that rejects every polyphonic-mix frame */
  musicRejectingThreshold: number | null;
  /** fraction of genuine singing frames that same threshold rejects */
  voiceLostAtThatThreshold: number | null;
}

export interface ConfidenceMetrics {
  clarity: Distribution;
  /**
   * How well confidence predicts correctness, as the area under the ROC curve
   * of `clarity` scoring "this frame is accurate". 0.5 = the confidence value
   * carries no information about whether the frame can be trusted; 1.0 = it
   * separates good frames from bad perfectly.
   */
  accuracyAuc: number | null;
  /** mean clarity on accurate frames minus mean clarity on inaccurate ones */
  separation: number | null;
}

export interface SettlingMeasurement {
  fromHz: number;
  toHz: number;
  semitones: number;
  /**
   * ms from the step instant until the reported pitch is within tolerance of
   * the new pitch and stays there. null when it never settles.
   */
  settlingMs: number | null;
  /** frames spent reporting neither the old nor the new pitch */
  transitionFrames: number;
}

export interface LatencyMetrics {
  /** window duration: the signal must exist before it can be analyzed */
  windowMs: number;
  /** frame spacing — the granularity of any answer */
  hopMs: number;
  /**
   * Analytic floor: window + hop. The earliest a fully-formed answer about a
   * new pitch can appear, before any algorithmic settling.
   */
  analyticFloorMs: number;
  /** measured cost of one analyze call; machine-dependent, never budgeted */
  processingMs: Distribution;
  /** processing cost as a fraction of the hop it must fit inside */
  realTimeFactor: number;
  /** measured response to real pitch steps */
  settling: SettlingMeasurement[];
  /** median settling across all steps, ms */
  medianSettlingMs: number | null;
}

/* ------------------------------------------------------------------ *
 * Results                                                             *
 * ------------------------------------------------------------------ */

export interface CaseResult {
  caseId: string;
  label: string;
  group: CaseGroup;
  corpusKind: CorpusKind;
  bandId?: string;
  frames: number;
  /**
   * Frames the reference declined to score — note transitions, annotation
   * onsets, anything ambiguous.
   *
   * Reported, not just applied. Exclusion is necessary (a window straddling two
   * pitches has no right answer) and it is also the easiest way to make a
   * detector look good, so the rate is on the record next to every result it
   * affects. A real-corpus exclusion rate that climbs between runs is a corpus
   * problem, not a detector improvement.
   */
  excludedFrames: number;
  excludedRate: number;
  trustedAnnotation?: boolean;
  accuracy: AccuracyMetrics | null;
  octave: OctaveMetrics | null;
  voicing: VoicingMetrics;
  stability: StabilityMetrics | null;
  confidence: ConfidenceMetrics;
  settling: SettlingMeasurement[];
  expectOctaveFailure: boolean;
  expectPitchMovement: boolean;
}

/** One operating range, with everything measured inside it. */
export interface BandMetrics {
  bandId: string;
  label: string;
  minHz: number;
  maxHz: number;
  cases: number;
  accuracy: AccuracyMetrics | null;
  octave: OctaveMetrics | null;
  voicing: VoicingMetrics;
  stability: StabilityMetrics | null;
}

/**
 * The real corpus, measured separately from the synthetic one at every level.
 *
 * Never merged into the headline bands. The two corpora answer different
 * questions — synthetic material bounds the algorithm against exact truth, real
 * material bounds the whole signal path against an annotation — and averaging
 * them would produce a number that answers neither. Where they disagree, the
 * disagreement is the finding.
 */
export interface RealCorpusMetrics {
  recordings: number;
  /** recordings whose annotation is reference-grade rather than machine-guessed */
  trustedRecordings: number;
  frames: number;
  scoredFrames: number;
  excludedRate: number;
  /**
   * All scored frames, banded by each frame's expected pitch. Use for voicing,
   * dropouts and octave errors, where a contour annotation is authoritative.
   */
  bands: BandMetrics[];
  /**
   * Sustained frames of recordings *declared* `sustained` — the subset where
   * cents accuracy against an automatic annotation means something. The only
   * table to quote for accuracy.
   */
  steadyBands: BandMetrics[];
  steadyFrames: number;
  sustainedRecordings: number;
  /**
   * Recordings declared `sustained` that measured otherwise, with the share of
   * their scored frames that held still. A recording problem to re-take, not a
   * detector result.
   */
  mislabelled: { caseId: string; steadyShare: number }[];
  confidence: ConfidenceMetrics;
  /** how many annotated frames fall in each band — the corpus's own coverage */
  bandCoverage: Record<string, number>;
  /** the tightest annotator error floor among the recordings, in cents */
  annotatorErrorFloorCents: number | null;
}

export interface BenchmarkReport {
  config: DetectorConfig;
  corpus: { cases: number; frames: number; scoredFrames: number };
  bands: BandMetrics[];
  /** null when no recordings are installed — the normal state until they are */
  real: RealCorpusMetrics | null;
  latency: LatencyMetrics;
  confidence: ConfidenceMetrics;
  /**
   * Can `clarity` tell a singer from a backing track? Measured as the AUC of
   * clarity separating voice frames from polyphonic-mix frames. Read it
   * together with `clarityGate` and never on its own — see `ClarityGateAnalysis`.
   */
  voiceVsMusicAuc: number | null;
  clarityGate: ClarityGateAnalysis;
  /**
   * Cases whose behaviour the band averages would hide: any octave error, or a
   * worst-frame error past `OUTLIER_CENTS`. Surfaced because an average over a
   * band is exactly the wrong instrument for finding a single broken case, and
   * a benchmark that only reports averages trains people to trust them.
   */
  outliers: CaseResult[];
  cases: CaseResult[];
}

/* ------------------------------------------------------------------ *
 * Budgets                                                             *
 * ------------------------------------------------------------------ */

/**
 * A budget is a *measured* value plus headroom, attached to one band of one
 * configuration. Every field is optional: a band asserts only what has actually
 * been measured for it, so an unmeasured quantity stays visibly unmeasured
 * instead of acquiring a plausible-looking bound.
 */
export interface BandBudget {
  bandId: string;
  maxMedianAbsCents?: number;
  maxP95AbsCents?: number;
  maxOctaveErrorRate?: number;
  /** for pinned known failures: the octave error must NOT go away silently */
  minOctaveErrorRate?: number;
  maxLostVoiceRate?: number;
  maxJitterCents?: number;
  maxNoteFlipsPerSec?: number;
}

export interface DetectorBudget {
  configId: string;
  /** why these numbers are what they are, in one line each */
  basis: string;
  bands: BandBudget[];
  maxFalsePitchRate?: number;
  maxRealTimeFactor?: number;
  maxMedianSettlingMs?: number;
}

export interface BudgetViolation {
  bandId: string;
  metric: string;
  measured: number;
  limit: number;
  /** 'over' — measured exceeded a maximum; 'under' — fell below a minimum */
  direction: 'over' | 'under';
}
