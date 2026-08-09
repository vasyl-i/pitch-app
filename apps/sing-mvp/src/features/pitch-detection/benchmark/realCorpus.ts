/**
 * The real-vocal corpus: annotation format, reference pitch, and case
 * construction.
 *
 * Pure — no filesystem, no decoding. `realCorpusLoader.ts` does the Node-side
 * work of reading and decimating files and hands the result here, which keeps
 * this module runnable anywhere the detector is, and keeps the format
 * decisions testable without fixtures on disk.
 *
 * ## Why real recordings need a different reference contract
 *
 * A synthetic case knows its own pitch exactly, forever. A real recording's f0
 * is an *annotation* — someone or something decided what the singer was doing,
 * and that decision can be wrong. Three consequences run through this file:
 *
 *  - annotations carry their provenance and a `verified` flag, and unverified
 *    material is reported separately rather than pooled;
 *  - windows the annotation cannot speak confidently about are excluded, and
 *    the exclusion rate is reported so it cannot quietly grow to flatter a
 *    result;
 *  - the annotator's own error floor bounds what the benchmark can resolve. A
 *    pYIN annotation is accurate to a few cents at best, so a real-corpus
 *    accuracy number below that is measuring the annotator, not the detector.
 */
import { bandFor } from './bands';
import type { BenchmarkCase, PitchReference } from './types';

/* ------------------------------------------------------------------ *
 * Annotation format                                                   *
 * ------------------------------------------------------------------ */

export type AnnotationMethod =
  /** machine-annotated by pYIN; the fastest path and the least trustworthy */
  | 'pyin'
  /** pYIN output a human has listened to and corrected */
  | 'pyin-verified'
  /** electroglottograph or laryngograph reference — the gold standard */
  | 'egg'
  /** the recording is a re-capture of a signal we generated, so f0 is exact */
  | 'synthesized-source'
  /** hand-annotated throughout */
  | 'manual';

/** Methods whose f0 can be treated as reference rather than as an estimate. */
export const TRUSTED_METHODS: AnnotationMethod[] = ['egg', 'synthesized-source', 'manual', 'pyin-verified'];

export interface VocalAnnotation {
  method: AnnotationMethod;
  /**
   * Whether a human has checked this annotation. `pyin` output is never
   * verified by definition; the ingestion script writes `false` and only a
   * person may change it.
   */
  verified: boolean;
  /** seconds between consecutive f0 values */
  hopSec: number;
  /** f0 per frame, in Hz. `null` (or 0) means the annotator found no pitch. */
  f0Hz: (number | null)[];
  /**
   * The annotator's own accuracy, in cents, if known. The benchmark cannot
   * resolve detector error below this, and the report says so rather than
   * printing a number that is really the annotator's noise floor.
   */
  annotatorErrorCents?: number;
}

/**
 * Where a recording came from and on what terms.
 *
 * Required, with no defaults, on every recording. This project has a documented
 * legal boundary around vocal audio, and a benchmark corpus is exactly the kind
 * of thing that accumulates files nobody can later account for. A recording
 * that cannot state its source, its licence and its consent basis does not
 * enter the corpus.
 */
export interface Provenance {
  /** who recorded it, or which dataset it came from */
  source: string;
  /** licence or terms the material is used under */
  license: string;
  /** the basis on which this voice may be used for benchmarking */
  consent: string;
}

export interface RecordingConditions {
  /** 'bass' | 'baritone' | 'tenor' | 'alto' | 'mezzo' | 'soprano' | free text */
  voiceType?: string;
  level?: 'quiet' | 'normal' | 'loud';
  /** e.g. 'treated room', 'kitchen', 'car', 'reverberant hall' */
  environment?: string;
  /** e.g. 'iphone-15-builtin', 'airpods-pro', 'sm58-into-scarlett' */
  device?: string;
  /** what was sung, e.g. 'chromatic scale C3–C4', 'Twinkle, first phrase' */
  material?: string;
  /** anything deliberately difficult about it: fry, breathiness, background TV */
  challenge?: string;
}

/**
 * What a recording is *for*, declared by whoever recorded it.
 *
 * Not cosmetic — it decides which measurements a recording may contribute to:
 *
 * - `sustained` — deliberately straight held notes. The **only** basis for
 *   absolute pitch-accuracy figures, because cents error against an automatic
 *   annotation is only meaningful where the pitch is still (see
 *   `STEADY_SPREAD_CENTS` for the measurement behind that).
 * - `expressive` — vibrato, slides, phrasing, scales, anything sung musically.
 *   Measured for tracking behaviour and robustness — voicing, dropouts, octave
 *   errors — where the annotation is authoritative. Never contributes to an
 *   accuracy number.
 *
 * `expressive` is the ingestion script's default, so contributing to an
 * accuracy figure is something a recordist opts into deliberately rather than
 * something they get by forgetting a flag.
 */
export type RecordingCategory = 'sustained' | 'expressive';

export const RECORDING_CATEGORIES: RecordingCategory[] = ['sustained', 'expressive'];

export interface RealRecording {
  id: string;
  label: string;
  category: RecordingCategory;
  provenance: Provenance;
  conditions: RecordingConditions;
  /** the file's own rate; must match the detector configuration's capture rate */
  sampleRateHz: number;
  annotation: VocalAnnotation;
}

/* ------------------------------------------------------------------ *
 * Validation                                                          *
 * ------------------------------------------------------------------ */

const REQUIRED_PROVENANCE: (keyof Provenance)[] = ['source', 'license', 'consent'];

/**
 * Reject a malformed or unaccountable recording loudly at load time.
 *
 * Returning a list rather than throwing on the first problem: someone adding
 * ten recordings should learn about all ten mistakes in one run.
 */
export function validateRecording(recording: Partial<RealRecording>): string[] {
  const problems: string[] = [];
  if (!recording.id) problems.push('missing id');
  if (!recording.sampleRateHz) problems.push('missing sampleRateHz');
  if (!recording.category || !RECORDING_CATEGORIES.includes(recording.category)) {
    problems.push(`category must be one of: ${RECORDING_CATEGORIES.join(', ')}`);
  }

  for (const key of REQUIRED_PROVENANCE) {
    if (!recording.provenance?.[key]) problems.push(`missing provenance.${key}`);
  }

  const annotation = recording.annotation;
  if (!annotation) {
    problems.push('missing annotation');
  } else {
    if (!(annotation.hopSec > 0)) problems.push('annotation.hopSec must be positive');
    if (!Array.isArray(annotation.f0Hz) || annotation.f0Hz.length === 0) {
      problems.push('annotation.f0Hz must be a non-empty array');
    }
    if (typeof annotation.verified !== 'boolean') problems.push('annotation.verified must be a boolean');
  }

  return problems;
}

/* ------------------------------------------------------------------ *
  * Reference pitch from an f0 contour                                   *
 * ------------------------------------------------------------------ */

/**
 * A window whose annotated pitch moves more than this is a transition, and is
 * excluded from accuracy scoring for the same reason a synthetic note boundary
 * is: the window contains two pitches and every answer is wrong. Response to
 * transitions is measured by settling, where it is the subject.
 *
 * Set at a semitone: wide enough to keep vibrato and expressive drift inside
 * the measurement (both are things the detector must track, not excuses), and
 * narrow enough to catch a real note change.
 */
export const TRANSITION_SPREAD_CENTS = 100;

/**
 * Spread allowed across a *sustained* window, in cents.
 *
 * ## What this is for, and the wrong version of it
 *
 * Measured: annotating a vibrato phrase with pYIN and scoring YIN against it
 * gives 1.27¢ median error. Regenerating the identical phrase without vibrato —
 * same material, same annotator, same exclusion rate — gives 0.39¢. Neither
 * detector is wrong; the gap is an artefact of comparing two contours of moving
 * pitch.
 *
 * That gap was originally measured at 3.74¢ and is now 1.27¢, because the first
 * measurement used librosa's default 10-cent annotation grid. Most of what
 * looked like a movement effect was quantization. The effect is real but small.
 *
 * The first attempt at isolating that was a window-local flatness test, and it
 * failed: it moved 3.74¢ only to 3.50¢ (both figures from the 10-cent-grid era).
 * The reason is that the disagreement is
 * not *within* a window. A ±7¢ vibrato spans well under this threshold inside
 * any single 46 ms window, so nearly every frame passed as "steady" while the
 * disagreement stayed. pYIN runs Viterbi decoding across frames, which smooths
 * its contour *temporally* — its vibrato lags and flattens relative to the true
 * instantaneous pitch, and a window-local test cannot see a temporal effect.
 *
 * So steadiness is tested over a neighbourhood instead (`STEADY_CONTEXT_SEC`):
 * a frame counts as sustained only if the annotated contour is flat for a
 * vibrato period either side of it. Where genuinely sustained material exists
 * this works — a corpus containing one steady recording and one vibrato'd one
 * reports 0.43¢ over the sustained subset against 0.66¢ over everything.
 *
 * ## What it still cannot do, and why nothing can
 *
 * On *continuously* vibrato'd material the filter keeps 17 frames of 177, and
 * those 17 still read 3.48¢. They are not a lucky steady patch: the flatness
 * test reads the smoothed annotation, so it selects exactly the frames where
 * the annotator flattened the vibrato most, which are the frames a
 * vibrato-tracking detector disagrees with hardest. The filter is
 * anti-correlated with what it is trying to find.
 *
 * That is not fixable by a better filter, because every filter must ask the
 * annotation, and the annotation is what is smoothed. It is fixable by
 * *recording*: cents-accuracy claims need takes of deliberately straight,
 * sustained notes. Hence the sustained-note requirement in the corpus
 * protocol, and the warning the report prints when the sustained subset is too
 * small to support a claim.
 *
 * The rule this encodes: **cents accuracy is only meaningful on sustained
 * material.** Moving material is still measured, for voicing, dropouts and
 * octave errors, where a contour annotation is authoritative.
 */
/**
 * Note the units: this is maximum deviation *from the window's median*, so a
 * contour swinging ±7¢ has a spread of 7, not 14.
 *
 * Set from the disagreement measurement rather than from what looks flat. A
 * ±7¢ contour modulation — shallower than the app's own vibrato-detection floor
 * of 15¢ peak-to-peak, i.e. movement too subtle to be called vibrato at all —
 * still produced 3.5¢ of detector-versus-annotator disagreement. Ten cents
 * would admit exactly that case. Two keeps the sustained subset to contours
 * flat enough that what remains is the detector.
 */
export const STEADY_SPREAD_CENTS = 12;

/**
 * A steadiness threshold below the annotation's own grid step can never be
 * satisfied, so the effective threshold is raised to this multiple of the grid
 * when necessary.
 *
 * Learned the hard way twice. At the original 10-cent pYIN grid, a 2-cent
 * threshold admitted 0.14% of frames; after re-annotating at a 5-cent grid it
 * admitted *zero*, because a quantized contour's spread is always a multiple of
 * the step. Both times the harness correctly refused to publish an accuracy
 * figure, and both times the cause was the measurement instrument rather than
 * the singing — which is what the report now says when a check fires for every
 * recording at once.
 */
export const MIN_SPREAD_GRID_MULTIPLE = 2;

/** Grid step implied by an annotation's RMS quantization error, in cents. */
export function annotationGridCents(annotation: VocalAnnotation): number {
  return annotation.annotatorErrorCents ? annotation.annotatorErrorCents * Math.sqrt(12) : 0;
}

/**
 * How far either side of a window the contour must also be flat, in seconds.
 *
 * One period of a slow vibrato (~5 Hz). Shorter and temporal smoothing in the
 * annotator hides inside the margin; much longer and genuine sustained notes
 * get excluded for having an onset nearby.
 */
export const STEADY_CONTEXT_SEC = 0.2;

const centsBetween = (a: number, b: number) => 1200 * Math.log2(a / b);

/**
 * Build a reference pitch from an automatic f0 annotation.
 *
 * Rules, in order:
 *   - no annotation covers the window            → excluded
 *   - every covered frame is unvoiced            → expect silence
 *   - some voiced, some not (an onset or release)→ excluded
 *   - the voiced frames span more than a semitone→ excluded (a transition)
 *   - otherwise                                  → their median
 */
export function annotationReference(
  annotation: VocalAnnotation,
  analysisRateHz: number,
  maxSpreadCents = TRANSITION_SPREAD_CENTS / 2
): PitchReference {
  const { hopSec, f0Hz } = annotation;

  return (startSample, endSample) => {
    const startSec = startSample / analysisRateHz;
    const endSec = endSample / analysisRateHz;

    const first = Math.ceil(startSec / hopSec);
    const last = Math.floor(endSec / hopSec);
    if (last < first) return 'excluded';

    let voiced = 0;
    let total = 0;
    const pitches: number[] = [];
    for (let i = first; i <= last && i < f0Hz.length; i++) {
      if (i < 0) continue;
      total++;
      const f0 = f0Hz[i];
      if (f0 !== null && f0 !== undefined && f0 > 0) {
        voiced++;
        pitches.push(f0);
      }
    }

    if (total === 0) return 'excluded';
    if (voiced === 0) return null;
    if (voiced < total) return 'excluded';

    const sorted = [...pitches].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const spread = Math.max(...pitches.map((p) => Math.abs(centsBetween(p, median))));
    return spread > maxSpreadCents ? 'excluded' : median;
  };
}

/**
 * Reference pitch restricted to genuinely sustained material.
 *
 * Delegates to `annotationReference` for the value, then requires the contour to be
 * flat across a wider neighbourhood before allowing the frame to be scored. The
 * neighbourhood is the whole point — see `STEADY_SPREAD_CENTS` for the
 * measurement that ruled out the window-local version.
 */
export function steadyAnnotationReference(
  annotation: VocalAnnotation,
  analysisRateHz: number,
  contextSec = STEADY_CONTEXT_SEC,
  maxSpreadCents = STEADY_SPREAD_CENTS
): PitchReference {
  // never ask for steadiness finer than the annotation can express
  const effectiveSpread = Math.max(
    maxSpreadCents,
    MIN_SPREAD_GRID_MULTIPLE * annotationGridCents(annotation)
  );
  const value = annotationReference(annotation, analysisRateHz);
  const flatness = annotationReference(annotation, analysisRateHz, effectiveSpread);
  const context = Math.round(contextSec * analysisRateHz);

  return (startSample, endSample) => {
    const scored = value(startSample, endSample);
    if (typeof scored !== 'number') return scored;
    const neighbourhood = flatness(Math.max(0, startSample - context), endSample + context);
    return typeof neighbourhood === 'number' ? scored : 'excluded';
  };
}

/* ------------------------------------------------------------------ *
 * Case construction                                                   *
 * ------------------------------------------------------------------ */

/**
 * Turn a decoded, already-decimated recording into a benchmark case.
 *
 * No `bandId`: a real recording moves through the range, so banding it as a
 * whole would be a lie. Real cases are aggregated by the band of each *frame's*
 * expected pitch instead — see the runner.
 */
export function buildRealCase(recording: RealRecording, analysisSignal: Float32Array, analysisRateHz: number): BenchmarkCase {
  return {
    id: `real-${recording.id}`,
    label: recording.label || recording.id,
    group: 'material',
    corpusKind: 'real',
    signal: analysisSignal,
    reference: annotationReference(recording.annotation, analysisRateHz),
    // the sustained subset, where cents accuracy is actually meaningful
    steadyReference: steadyAnnotationReference(recording.annotation, analysisRateHz),
    trustedAnnotation: TRUSTED_METHODS.includes(recording.annotation.method) && recording.annotation.verified,
    recording,
  };
}

/** The pitch range an annotation actually covers, for corpus coverage reporting. */
export function annotatedRange(annotation: VocalAnnotation): { minHz: number; maxHz: number } | null {
  const voiced = annotation.f0Hz.filter((f): f is number => f !== null && f !== undefined && f > 0);
  if (voiced.length === 0) return null;
  return { minHz: Math.min(...voiced), maxHz: Math.max(...voiced) };
}

/**
 * Which operating ranges a set of recordings actually exercises.
 *
 * Coverage is the first thing to check about a real corpus and the easiest to
 * assume: thirty recordings of comfortable mid-range singing measure one band
 * thirty times and say nothing about the two where the detector is weakest.
 */
export function bandCoverage(recordings: RealRecording[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const recording of recordings) {
    for (const f0 of recording.annotation.f0Hz) {
      if (f0 === null || f0 === undefined || f0 <= 0) continue;
      const band = bandFor(f0);
      if (band) counts[band.id] = (counts[band.id] ?? 0) + 1;
    }
  }
  return counts;
}
