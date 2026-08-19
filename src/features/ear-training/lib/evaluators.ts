/**
 * Scoring for every ear-training exercise. Pure functions over the capture's
 * frame log — no timers, no audio, no store.
 *
 * The reliability contract: each exercise has exactly ONE evaluator, and the
 * session runs it both continuously while the user sings (for the live
 * readout) and once when the window closes (for the round result). Because
 * both calls are the same function over the same growing frame log, the final
 * score is by construction the value the live display was already showing —
 * it can never "jump" after singing ends.
 *
 * All sung-pitch comparison is octave-agnostic (`centsToNearestOctave`),
 * consistent with the rest of the app: singers answer in their own register.
 * Melodic *intervals* and contour are graded in the singer's own register,
 * where relative motion is meaningful.
 */
import { centsToNearestOctave, median, PERFECT_CENTS, pitchClassName, SLIGHT_CENTS } from '@/shared/lib/music';
import { segmentNotes, type SungFrame, type SungNote } from './capture';
import { chordDegreeName, noteName, type MelodyNote } from './theory';

/** ear training is more forgiving than melody grading: still "close", not "off" */
export const CLOSE_CENTS = 70;
/** fewer voiced frames than this means we never really heard a note */
const MIN_FRAMES = 6;

/* ------------------------------------------------------------------ *
 * Result shape (unified across all exercises)                         *
 * ------------------------------------------------------------------ */

export type OutcomeStatus = 'hit' | 'close' | 'missing' | 'extra' | 'wrong';

/** One row of per-note detail on the results screen. */
export interface NoteOutcome {
  /** e.g. "E — third" or "sung F♯" */
  label: string;
  status: OutcomeStatus;
  /** signed cents deviation where the note was heard */
  cents: number | null;
  /** target pitch, on rows that grade a target note — absent on 'extra' rows */
  midi?: number;
}

export interface OverlayNote {
  midi: number;
  start: number;
  duration: number;
}

/** The one result shape every exercise produces. */
export interface RoundScore {
  ok: boolean;
  /** 0–100 */
  score: number;
  /** headline, always friendly: "Excellent!", "Almost", "Try once more" */
  label: string;
  /** coaching line, e.g. "just a touch sharp" */
  detail: string;
  expected: string;
  actual: string;
  /** mean |cents| across heard notes */
  avgCents: number | null;
  /** mean signed cents — powers the sharp/flat tendency tip */
  signedCents: number | null;
  pitchAccuracy: number | null;
  rhythmAccuracy: number | null;
  notes?: NoteOutcome[];
  /** target vs sung, register-aligned, for the melody overlay */
  overlay?: { target: OverlayNote[]; sung: OverlayNote[] };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** |cents| → 0–100. Full marks inside the "perfect" band, ~0 past a wrong note. */
export function centsScore(absCents: number): number {
  return clamp(Math.round(100 - Math.max(0, absCents - PERFECT_CENTS) * 0.9), 0, 100);
}

function sharpFlat(cents: number, mild: string, stronger: string): string {
  const word = cents > 0 ? 'sharp' : 'flat';
  return Math.abs(cents) <= SLIGHT_CENTS ? `${mild} ${word}` : `${stronger} ${word}`;
}

const NOT_HEARD: Omit<RoundScore, 'expected'> = {
  ok: false,
  score: 0,
  label: "Didn't quite catch that",
  detail: 'sing right after the tone, nice and steady',
  actual: '—',
  avgCents: null,
  signedCents: null,
  pitchAccuracy: null,
  rhythmAccuracy: null,
};

/* ------------------------------------------------------------------ *
 * Single target note (echo, pitch memory, interval, finish melody)    *
 * ------------------------------------------------------------------ */

/**
 * Grade a window where the user sings one target pitch class. Median cents
 * over the whole log, so a shaky attack doesn't dominate a settled note.
 */
export function evaluateSingleTarget(frames: SungFrame[], targetPc: number, expectedName: string): RoundScore {
  if (frames.length < MIN_FRAMES) return { ...NOT_HEARD, expected: expectedName };

  const deviation = median(frames.map((f) => centsToNearestOctave(f.midi, targetPc)));
  const off = Math.abs(deviation);
  const sungName = pitchClassName(median(frames.map((f) => f.midi)));
  const base = {
    expected: expectedName,
    actual: sungName,
    avgCents: Math.round(off),
    signedCents: Math.round(deviation),
    pitchAccuracy: centsScore(off),
    rhythmAccuracy: null,
    score: centsScore(off),
  };

  if (off <= SLIGHT_CENTS) {
    return {
      ...base,
      ok: true,
      label: 'Excellent!',
      detail: off <= PERFECT_CENTS ? 'dead center' : sharpFlat(deviation, 'just a touch', 'a little'),
    };
  }
  if (off <= CLOSE_CENTS) {
    return {
      ...base,
      ok: false,
      label: 'Almost',
      detail: deviation > 0 ? 'slightly sharp — relax down into the note' : 'slightly flat — lift up into the note',
    };
  }
  return {
    ...base,
    ok: false,
    label: 'Try once more',
    detail: `we heard ${sungName} — take another listen, you'll get it`,
  };
}

/* ------------------------------------------------------------------ *
 * Chord tones                                                         *
 * ------------------------------------------------------------------ */

export type ChordToneOrder = 'any' | 'ascending' | 'requested';

export interface ChordToneTarget {
  /** semitones above root, per chord tone (root included) */
  intervals: number[];
  rootMidi: number;
  order: ChordToneOrder;
  /** for 'requested': indices into `intervals` in the order asked for */
  requestedOrder?: number[];
}

interface ToneMatch {
  note: SungNote;
  cents: number;
}

/**
 * Grade "sing every note in the chord": segment the singing into notes, match
 * each sung note to the closest chord tone, then check coverage, intonation
 * and (per difficulty) order.
 */
export function evaluateChordTones(frames: SungFrame[], target: ChordToneTarget): RoundScore {
  const expectedPcs = target.intervals.map((i) => (target.rootMidi + i) % 12);
  const expectedLabels = target.intervals.map(
    (i) => `${noteName(target.rootMidi + i)} — ${chordDegreeName(i)}`
  );
  const expectedNames = target.intervals.map((i) => noteName(target.rootMidi + i));
  const expectedText = expectedNames.join('  ·  ');

  if (frames.length < MIN_FRAMES) return { ...NOT_HEARD, expected: expectedText };

  const sung = segmentNotes(frames);
  // best sung note per chord tone, plus everything that matched nothing
  const matches: (ToneMatch | null)[] = expectedPcs.map(() => null);
  const extras: SungNote[] = [];
  for (const note of sung) {
    let bestIdx = -1;
    let bestCents = Infinity;
    expectedPcs.forEach((pc, i) => {
      const cents = centsToNearestOctave(note.midi, pc);
      if (Math.abs(cents) < Math.abs(bestCents)) {
        bestCents = cents;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && Math.abs(bestCents) <= CLOSE_CENTS) {
      const existing = matches[bestIdx];
      if (!existing || Math.abs(bestCents) < Math.abs(existing.cents)) {
        if (existing) extras.push(existing.note);
        matches[bestIdx] = { note, cents: bestCents };
      }
      // repeating an already-found tone is harmless, not an "extra"
    } else {
      extras.push(note);
    }
  }

  const hits = matches.filter((m): m is ToneMatch => m !== null);
  const coverage = hits.length / expectedPcs.length;

  // order is judged over the tones actually found, in sung order
  const sungOrder = [...hits].sort((a, b) => a.note.start - b.note.start);
  let orderOk = true;
  if (target.order === 'ascending') {
    orderOk = sungOrder.every((m, i) => i === 0 || m.note.midi > sungOrder[i - 1].note.midi - 0.5);
  } else if (target.order === 'requested' && target.requestedOrder) {
    const wantPcs = target.requestedOrder.map((i) => expectedPcs[i]);
    const gotPcs = sungOrder.map((m) => expectedPcs[matches.indexOf(m)]);
    orderOk = gotPcs.every((pc, i) => pc === wantPcs[i]);
  }

  const intonation = hits.length ? hits.reduce((a, m) => a + centsScore(Math.abs(m.cents)), 0) / hits.length : 0;
  const dedupedExtras = dedupeByPitchClass(extras);
  const score = clamp(
    Math.round(coverage * 60 + (orderOk ? 15 : 0) + intonation * 0.25 - dedupedExtras.length * 4),
    0,
    100
  );

  const notes: NoteOutcome[] = matches.map((m, i) => ({
    label: expectedLabels[i],
    midi: target.rootMidi + target.intervals[i],
    status: m === null ? 'missing' : Math.abs(m.cents) <= SLIGHT_CENTS ? 'hit' : 'close',
    cents: m === null ? null : Math.round(m.cents),
  }));
  for (const extra of dedupedExtras) {
    notes.push({ label: `sung ${noteName(extra.midi)}`, status: 'extra', cents: null });
  }

  const missingNames = matches.flatMap((m, i) => (m === null ? [expectedNames[i]] : []));
  const allFound = missingNames.length === 0;
  const detail = !allFound
    ? `${missingNames.join(' and ')} got away — hear it again and hunt ${missingNames.length > 1 ? 'them' : 'it'} down`
    : !orderOk
      ? target.order === 'ascending'
        ? 'all the notes are there — now try them from the bottom up'
        : 'all the notes are there — now in the order asked'
      : hits.every((m) => Math.abs(m.cents) <= SLIGHT_CENTS)
        ? 'every chord tone, right in tune'
        : 'you found every note — polish the tuning and it’s perfect';

  const signed = hits.map((m) => m.cents);
  return {
    ok: allFound && orderOk,
    score,
    label: allFound && orderOk ? 'Excellent!' : coverage >= 0.5 ? 'Almost' : 'Try once more',
    detail,
    expected: expectedText,
    actual: sungOrder.map((m) => noteName(Math.round(m.note.midi))).join('  ·  ') || '—',
    avgCents: signed.length ? Math.round(signed.reduce((a, c) => a + Math.abs(c), 0) / signed.length) : null,
    signedCents: signed.length ? Math.round(signed.reduce((a, c) => a + c, 0) / signed.length) : null,
    pitchAccuracy: Math.round(intonation),
    rhythmAccuracy: null,
    notes,
  };
}

function dedupeByPitchClass(notes: SungNote[]): SungNote[] {
  const seen = new Set<number>();
  return notes.filter((n) => {
    const pc = Math.round(n.midi) % 12;
    if (seen.has(pc)) return false;
    seen.add(pc);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Melody echo                                                         *
 * ------------------------------------------------------------------ */

/**
 * Grade an echoed melody note-for-note: pitch per position, rhythm from
 * inter-onset ratios, intervals and contour from the singer's own motion,
 * plus a landing check on the final note.
 */
export function evaluateMelodyEcho(frames: SungFrame[], target: MelodyNote[]): RoundScore {
  const expectedText = target.map((n) => noteName(n.midi)).join('  ·  ');
  if (frames.length < MIN_FRAMES) return { ...NOT_HEARD, expected: expectedText };

  const sung = segmentNotes(frames);
  if (sung.length === 0) return { ...NOT_HEARD, expected: expectedText };

  const pairs = Math.min(sung.length, target.length);
  const pairCents: number[] = [];
  for (let i = 0; i < pairs; i++) {
    pairCents.push(centsToNearestOctave(sung[i].midi, target[i].midi % 12));
  }

  // pitch: every target note counts; unsung notes score zero
  const pitchAccuracy = Math.round(pairCents.reduce((a, c) => a + centsScore(Math.abs(c)), 0) / target.length);

  // rhythm: compare consecutive inter-onset intervals as ratios (tempo-tolerant)
  let rhythmAccuracy: number | null = null;
  if (target.length >= 2) {
    const scores: number[] = [];
    for (let i = 0; i + 1 < pairs; i++) {
      const targetIoi = target[i + 1].start - target[i].start;
      const sungIoi = sung[i + 1].start - sung[i].start;
      if (targetIoi > 0 && sungIoi > 0) {
        scores.push(clamp(100 - Math.abs(Math.log2(sungIoi / targetIoi)) * 120, 0, 100));
      } else {
        scores.push(0);
      }
    }
    const denominator = target.length - 1;
    rhythmAccuracy = denominator > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / denominator) : null;
  }

  // intervals & contour, in the singer's own register
  let intervalHits = 0;
  let contourHits = 0;
  const motionCount = pairs - 1;
  for (let i = 0; i + 1 < pairs; i++) {
    const sungStep = sung[i + 1].midi - sung[i].midi;
    const targetStep = target[i + 1].midi - target[i].midi;
    if (Math.abs(sungStep - targetStep) <= 1.0) intervalHits++;
    const sign = (v: number) => (v > 0.5 ? 1 : v < -0.5 ? -1 : 0);
    if (sign(sungStep) === sign(targetStep)) contourHits++;
  }
  const targetMotions = target.length - 1;
  const intervalAccuracy = targetMotions > 0 ? (100 * intervalHits) / targetMotions : 100;
  const contourAccuracy = targetMotions > 0 ? (100 * contourHits) / targetMotions : 100;

  const lastCents =
    sung.length >= target.length
      ? centsToNearestOctave(sung[target.length - 1].midi, target[target.length - 1].midi % 12)
      : null;
  const finalNoteOk = lastCents !== null && Math.abs(lastCents) <= CLOSE_CENTS;

  const score = Math.round(
    pitchAccuracy * 0.45 +
      (rhythmAccuracy ?? 100) * 0.2 +
      intervalAccuracy * 0.15 +
      contourAccuracy * 0.1 +
      (finalNoteOk ? 100 : 0) * 0.1
  );

  const notes: NoteOutcome[] = target.map((n, i) => {
    if (i >= pairs) return { label: noteName(n.midi), midi: n.midi, status: 'missing', cents: null };
    const cents = pairCents[i];
    const status: OutcomeStatus =
      Math.abs(cents) <= SLIGHT_CENTS ? 'hit' : Math.abs(cents) <= CLOSE_CENTS ? 'close' : 'wrong';
    return { label: noteName(n.midi), midi: n.midi, status, cents: Math.round(cents) };
  });
  for (let i = target.length; i < sung.length; i++) {
    notes.push({ label: `sung ${noteName(Math.round(sung[i].midi))}`, status: 'extra', cents: null });
  }

  // register-align the sung line to the target for the overlay
  const octaveShift = pairs > 0 ? Math.round(median(pairCents.map((_, i) => target[i].midi - sung[i].midi)) / 12) * 12 : 0;
  const overlay = {
    target: target.map((n) => ({ midi: n.midi, start: n.start, duration: n.duration })),
    sung: sung.map((n) => ({ midi: n.midi + octaveShift, start: n.start, duration: n.duration })),
  };

  const detail =
    sung.length < target.length
      ? `we heard ${sung.length} of ${target.length} notes — let the whole phrase land, then sing`
      : score >= 85
        ? 'shape, notes and timing all together'
        : contourAccuracy >= 99 && pitchAccuracy < 70
          ? 'great shape — now aim each note a little more precisely'
          : rhythmAccuracy !== null && rhythmAccuracy < 60
            ? 'the notes are there — keep the timing as even as the original'
            : 'good line — one more listen and it’s yours';

  return {
    ok: score >= 70,
    score,
    label: score >= 85 ? 'Excellent!' : score >= 55 ? 'Almost' : 'Try once more',
    detail,
    expected: expectedText,
    actual: sung.map((n) => noteName(Math.round(n.midi))).join('  ·  '),
    avgCents: pairCents.length ? Math.round(pairCents.reduce((a, c) => a + Math.abs(c), 0) / pairCents.length) : null,
    signedCents: pairCents.length ? Math.round(pairCents.reduce((a, c) => a + c, 0) / pairCents.length) : null,
    pitchAccuracy,
    rhythmAccuracy,
    notes,
    overlay,
  };
}

/* ------------------------------------------------------------------ *
 * Choice answers (major/minor, odd one out)                           *
 * ------------------------------------------------------------------ */

export function evaluateChoice(options: {
  chosen: string;
  correct: string;
  expectedLabel: string;
  chosenLabel: string;
  detail: string;
}): RoundScore {
  const ok = options.chosen === options.correct;
  return {
    ok,
    score: ok ? 100 : 0,
    label: ok ? 'Excellent!' : 'Not quite',
    detail: options.detail,
    expected: options.expectedLabel,
    actual: options.chosenLabel,
    avgCents: null,
    signedCents: null,
    pitchAccuracy: null,
    rhythmAccuracy: null,
  };
}

/* ------------------------------------------------------------------ *
 * Session summary                                                     *
 * ------------------------------------------------------------------ */

export interface SessionSummary {
  /** mean round score, 0–100 */
  overall: number;
  correctRounds: number;
  totalRounds: number;
  /** means over rounds that reported the metric */
  pitchAccuracy: number | null;
  rhythmAccuracy: number | null;
  avgCents: number | null;
  /** friendly, specific coaching lines */
  improvements: string[];
}

const meanOf = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

export function summarizeSession(results: RoundScore[]): SessionSummary {
  const overall = meanOf(results.map((r) => r.score)) ?? 0;
  const pitchAccuracy = meanOf(results.flatMap((r) => (r.pitchAccuracy !== null ? [r.pitchAccuracy] : [])));
  const rhythmAccuracy = meanOf(results.flatMap((r) => (r.rhythmAccuracy !== null ? [r.rhythmAccuracy] : [])));
  const avgCents = meanOf(results.flatMap((r) => (r.avgCents !== null ? [r.avgCents] : [])));
  const tendency = meanOf(results.flatMap((r) => (r.signedCents !== null ? [r.signedCents] : [])));

  const improvements: string[] = [];
  if (tendency !== null && tendency > 15) improvements.push('You tend to land a touch sharp — ease into notes from just below.');
  if (tendency !== null && tendency < -15) improvements.push('You tend to land a touch flat — think of lifting up into each note.');
  if (rhythmAccuracy !== null && rhythmAccuracy < 70) improvements.push('Timing drifted — try tapping the pulse while you listen.');
  const unheard = results.filter((r) => r.actual === '—').length;
  if (unheard > 0) improvements.push('Some rounds we couldn’t hear you — sing out right after the prompt.');
  if (improvements.length === 0) {
    improvements.push(overall >= 85 ? 'Your ear is wide awake — try a harder level next.' : 'Keep the daily reps going — this is exactly how ears get sharp.');
  }

  return {
    overall,
    correctRounds: results.filter((r) => r.ok).length,
    totalRounds: results.length,
    pitchAccuracy,
    rhythmAccuracy,
    avgCents,
    improvements,
  };
}
