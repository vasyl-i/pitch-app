/**
 * The measurements themselves: pure functions from frame observations to
 * numbers. No detector, no signal generation, no I/O — so every metric can be
 * unit-tested against a hand-built observation list whose right answer is known
 * by construction.
 *
 * That separation is the whole reason to have this file. A benchmark that
 * cannot itself be tested is just a second implementation nobody checks, and
 * the numbers it prints inherit the credibility of the code that produced them.
 */
import type {
  AccuracyMetrics,
  CaseResult,
  ClarityGateAnalysis,
  ConfidenceMetrics,
  Distribution,
  FrameObservation,
  OctaveMetrics,
  SettlingMeasurement,
  StabilityMetrics,
  VoicingMetrics,
} from './types';

/** worst-frame error past which a case is called out individually, in cents */
export const OUTLIER_CENTS = 100;

/**
 * Cases an average would bury: any octave error at all, or a worst frame past
 * `OUTLIER_CENTS`. Pinned failures above the declared ceiling are expected and
 * excluded — they are already reported as their own band.
 */
export function findOutliers(results: CaseResult[]): CaseResult[] {
  return results.filter((c) => {
    if (c.expectOctaveFailure) return false;
    const octaveErrors = (c.octave?.errorRate ?? 0) > 0;
    const wildFrame = (c.accuracy?.absCents.max ?? 0) > OUTLIER_CENTS;
    return octaveErrors || wildFrame;
  });
}

/* ------------------------------------------------------------------ *
 * Statistics                                                          *
 * ------------------------------------------------------------------ */

const EMPTY_DISTRIBUTION: Distribution = { count: 0, mean: NaN, median: NaN, p95: NaN, max: NaN };

/** Linear-interpolated percentile, 0..1. Does not mutate the input. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / values.length);
}

export function distribution(values: number[]): Distribution {
  if (values.length === 0) return EMPTY_DISTRIBUTION;
  return {
    count: values.length,
    mean: mean(values),
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: Math.max(...values),
  };
}

/**
 * Area under the ROC curve, via the rank-sum identity — no curve is
 * constructed, and ties are handled by averaging ranks rather than by breaking
 * them arbitrarily (which would let a detector that returns one constant
 * confidence value score above 0.5 by luck of ordering).
 *
 * Returns null when one class is empty: with nothing to separate, the honest
 * answer is "not measurable here", not 0.5.
 */
export function rocAuc(positives: number[], negatives: number[]): number | null {
  if (positives.length === 0 || negatives.length === 0) return null;

  const labelled = [
    ...positives.map((v) => ({ v, pos: true })),
    ...negatives.map((v) => ({ v, pos: false })),
  ].sort((a, b) => a.v - b.v);

  // average ranks within each run of equal values
  const ranks = new Array<number>(labelled.length);
  let i = 0;
  while (i < labelled.length) {
    let j = i;
    while (j + 1 < labelled.length && labelled[j + 1].v === labelled[i].v) j++;
    const avg = (i + j) / 2 + 1; // ranks are 1-based
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }

  let rankSum = 0;
  for (let k = 0; k < labelled.length; k++) if (labelled[k].pos) rankSum += ranks[k];

  const nPos = positives.length;
  const nNeg = negatives.length;
  return (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/* ------------------------------------------------------------------ *
 * Pitch error primitives                                              *
 * ------------------------------------------------------------------ */

export function centsBetween(detectedHz: number, expectedHz: number): number {
  return 1200 * Math.log2(detectedHz / expectedHz);
}

/** Cents error folded into the nearest octave — isolates tuning from octave errors. */
export function foldedCents(detectedHz: number, expectedHz: number): number {
  let c = centsBetween(detectedHz, expectedHz) % 1200;
  if (c > 600) c -= 1200;
  if (c < -600) c += 1200;
  // an exact octave leaves -0 behind, which formats as "-0.00¢" in the report
  return c === 0 ? 0 : c;
}

/** Octaves off, rounded. 0 when the detection is on the right octave. */
export function octaveOffset(detectedHz: number, expectedHz: number): number {
  return Math.round(Math.log2(detectedHz / expectedHz));
}

/** Frames with a detected pitch, a known expected pitch, and scoring enabled. */
function scoredPairs(frames: FrameObservation[], useStable: boolean): { hz: number; expectedHz: number; clarity: number }[] {
  const out: { hz: number; expectedHz: number; clarity: number }[] = [];
  for (const f of frames) {
    if (!f.scored || typeof f.expectedHz !== 'number') continue;
    const hz = useStable ? f.stableFrequency : f.frequency;
    if (hz === null) continue;
    out.push({ hz, expectedHz: f.expectedHz, clarity: f.clarity });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Accuracy                                                            *
 * ------------------------------------------------------------------ */

/** Tolerance bands reported for every accuracy measurement, in cents. */
export const TOLERANCE_BANDS = [5, 10, 25, 50] as const;

/**
 * Accuracy over the frames that have a reference pitch.
 *
 * Cents error is octave-folded, and octave errors are counted separately by
 * `octaveMetrics`. Mixing them produces a number that means nothing: a single
 * octave error contributes 1200¢ and drags the mean past every other frame in
 * the case, so a detector with 99% perfect frames and 1% octave errors would
 * report ~12¢ "accuracy" and look merely mediocre instead of specifically
 * broken.
 */
export function accuracyMetrics(frames: FrameObservation[], useStable = false): AccuracyMetrics | null {
  const pairs = scoredPairs(frames, useStable);
  if (pairs.length === 0) return null;

  const signed = pairs.map((p) => foldedCents(p.hz, p.expectedHz));
  const abs = signed.map(Math.abs);

  const withinCents: Record<number, number> = {};
  for (const tol of TOLERANCE_BANDS) {
    withinCents[tol] = abs.filter((c) => c <= tol).length / abs.length;
  }

  return {
    scoredFrames: pairs.length,
    absCents: distribution(abs),
    biasCents: mean(signed),
    withinCents,
  };
}

export function octaveMetrics(frames: FrameObservation[], useStable = false): OctaveMetrics | null {
  const pairs = scoredPairs(frames, useStable);
  if (pairs.length === 0) return null;

  let low = 0;
  let high = 0;
  for (const p of pairs) {
    const off = octaveOffset(p.hz, p.expectedHz);
    if (off < 0) low++;
    else if (off > 0) high++;
  }
  return { scoredFrames: pairs.length, errorRate: (low + high) / pairs.length, low, high };
}

/* ------------------------------------------------------------------ *
 * Voicing                                                             *
 * ------------------------------------------------------------------ */

/**
 * Two different failures, deliberately never combined into one "voicing
 * accuracy": missing a note the singer sang and inventing one they did not are
 * not interchangeable. The first costs coverage, the second corrupts scoring.
 */
export function voicingMetrics(frames: FrameObservation[]): VoicingMetrics {
  let detected = 0;
  let voicedExpected = 0;
  let voicedDetected = 0;
  let silentExpected = 0;
  let silentDetected = 0;

  for (const f of frames) {
    const hasPitch = f.frequency !== null;
    if (hasPitch) detected++;
    if (typeof f.expectedHz === 'number') {
      voicedExpected++;
      if (hasPitch) voicedDetected++;
    } else if (f.expectedHz === null) {
      silentExpected++;
      if (hasPitch) silentDetected++;
    }
  }

  return {
    frames: frames.length,
    detected,
    lostVoiceRate: voicedExpected ? 1 - voicedDetected / voicedExpected : 0,
    falsePitchRate: silentExpected ? silentDetected / silentExpected : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Stability                                                           *
 * ------------------------------------------------------------------ */

const MIDI_FROM_HZ = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/**
 * Jitter, worst single jump, and note flicker on steady material.
 *
 * Jitter is the stdev of the cents *error*, not of the raw pitch, so a
 * detector that is consistently 8¢ sharp scores as perfectly stable — which it
 * is. Being wrong and being unsteady are separate defects with separate fixes,
 * and a singer experiences them completely differently.
 *
 * Returns null when the case has no steady stretch to measure.
 */
export function stabilityMetrics(frames: FrameObservation[], useStable = false): StabilityMetrics | null {
  const scored: { hz: number; expectedHz: number; timeSec: number }[] = [];
  for (const f of frames) {
    if (!f.scored || typeof f.expectedHz !== 'number') continue;
    const hz = useStable ? f.stableFrequency : f.frequency;
    if (hz === null) continue;
    scored.push({ hz, expectedHz: f.expectedHz, timeSec: f.timeSec });
  }
  if (scored.length < 3) return null;

  const errors = scored.map((s) => foldedCents(s.hz, s.expectedHz));

  let maxFrameDeltaCents = 0;
  let noteFlips = 0;
  for (let i = 1; i < scored.length; i++) {
    // consecutive frames only — a gap means the run was broken and the
    // "jump" across it is not something the detector did
    const contiguous = scored[i].timeSec - scored[i - 1].timeSec < 0.05;
    if (!contiguous) continue;
    maxFrameDeltaCents = Math.max(maxFrameDeltaCents, Math.abs(errors[i] - errors[i - 1]));
    const prevNote = Math.round(MIDI_FROM_HZ(scored[i - 1].hz));
    const note = Math.round(MIDI_FROM_HZ(scored[i].hz));
    if (prevNote !== note) noteFlips++;
  }

  const spanSec = scored[scored.length - 1].timeSec - scored[0].timeSec;
  return {
    jitterCents: stdev(errors),
    maxFrameDeltaCents,
    noteFlipsPerSec: spanSec > 0 ? noteFlips / spanSec : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Confidence quality                                                  *
 * ------------------------------------------------------------------ */

/** a frame counts as accurate if it is on the right octave and inside this */
export const CONFIDENCE_ACCURATE_CENTS = 25;

/**
 * Does the confidence value actually predict correctness?
 *
 * Every downstream module is supposed to weight frames by confidence, which is
 * only worth doing if confidence carries information. The AUC answers that
 * directly, and it can be uncomfortable: a detector whose confidence is high on
 * every frame it returns at all — accurate or not — scores ~0.5 and should stop
 * being treated as a gate.
 */
export function confidenceMetrics(frames: FrameObservation[]): ConfidenceMetrics {
  const clarities: number[] = [];
  const accurate: number[] = [];
  const inaccurate: number[] = [];

  for (const f of frames) {
    if (f.frequency === null) continue;
    clarities.push(f.clarity);
    if (!f.scored || typeof f.expectedHz !== 'number') continue;
    const onOctave = octaveOffset(f.frequency, f.expectedHz) === 0;
    const close = Math.abs(foldedCents(f.frequency, f.expectedHz)) <= CONFIDENCE_ACCURATE_CENTS;
    (onOctave && close ? accurate : inaccurate).push(f.clarity);
  }

  return {
    clarity: distribution(clarities),
    accuracyAuc: rocAuc(accurate, inaccurate),
    separation: accurate.length && inaccurate.length ? mean(accurate) - mean(inaccurate) : null,
  };
}

/**
 * What it would cost to gate on clarity.
 *
 * Takes the clarity values of clean singing, breathy singing and a polyphonic
 * mix, and answers the only question a gate actually poses: set the threshold
 * high enough to reject the backing track, and how much real singing goes with
 * it? A high AUC can coexist with a catastrophic answer here, which is why both
 * are reported.
 */
export function clarityGateAnalysis(
  voice: number[],
  breathy: number[],
  music: number[]
): ClarityGateAnalysis {
  const singing = [...voice, ...breathy];
  const threshold = music.length ? Math.max(...music) : null;

  return {
    voiceClarityMedian: voice.length ? percentile(voice, 0.5) : null,
    breathyClarityMedian: breathy.length ? percentile(breathy, 0.5) : null,
    musicClarityMedian: music.length ? percentile(music, 0.5) : null,
    musicRejectingThreshold: threshold,
    voiceLostAtThatThreshold:
      threshold === null || singing.length === 0
        ? null
        : singing.filter((c) => c <= threshold).length / singing.length,
  };
}

/* ------------------------------------------------------------------ *
 * Settling (response latency)                                         *
 * ------------------------------------------------------------------ */

/** how close to the new pitch counts as "arrived", in cents */
export const SETTLING_TOLERANCE_CENTS = 50;

/**
 * How long after a pitch step the detector reports the new pitch and keeps
 * reporting it.
 *
 * Measured from the step instant, not from the first frame whose window is
 * fully inside the new pitch — the singer changed note at the step, and the
 * time spent waiting for the window to refill is latency they experience, not
 * an allowance the measurement should hand back. That makes this number
 * strictly larger than the analytic floor, and directly comparable to it.
 *
 * "Keeps reporting it" matters: a detector that flickers onto the new pitch for
 * one frame and falls back has not settled, and taking the first touch would
 * report a latency the singer never gets.
 */
export function measureSettling(
  frames: FrameObservation[],
  step: { atSample: number; fromHz: number; toHz: number },
  sampleRate: number,
  useStable = false,
  toleranceCents = SETTLING_TOLERANCE_CENTS
): SettlingMeasurement {
  const stepSec = step.atSample / sampleRate;
  const semitones = Math.round(12 * Math.log2(step.toHz / step.fromHz));

  // availability, not midpoint: a window centred 18ms after the step already
  // ends 41ms after it, and reporting the midpoint would credit the detector
  // with knowing about audio it had not yet received
  const after = frames.filter((f) => f.availableSec >= stepSec);
  const onTarget = (f: FrameObservation) => {
    const hz = useStable ? f.stableFrequency : f.frequency;
    return hz !== null && Math.abs(centsBetween(hz, step.toHz)) <= toleranceCents;
  };

  let settledAt: number | null = null;
  for (let i = 0; i < after.length; i++) {
    if (!onTarget(after[i])) {
      settledAt = null;
      continue;
    }
    if (settledAt === null) settledAt = after[i].availableSec;
    // require the rest of the case to stay on target; the loop only records a
    // candidate and any later miss resets it
  }

  let transitionFrames = 0;
  for (const f of after) {
    if (settledAt !== null && f.availableSec >= settledAt) break;
    transitionFrames++;
  }

  return {
    fromHz: step.fromHz,
    toHz: step.toHz,
    semitones,
    settlingMs: settledAt === null ? null : (settledAt - stepSec) * 1000,
    transitionFrames,
  };
}
