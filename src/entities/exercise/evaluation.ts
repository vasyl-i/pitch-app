/**
 * Grading a sung performance against a target melody. Pure functions plus one
 * incremental evaluator.
 *
 * This lives on the entity rather than inside the staff-practice feature: what
 * "a note was sung sharp" means is a property of the exercise domain, and the
 * next practice surface (loop drills, sight-singing, a second renderer) needs
 * the same verdicts without depending on the staff UI slice.
 *
 * Octave-agnostic throughout — singers use their own register.
 */
import { centsToNearestOctave, median, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import { translatedRecord } from '@/shared/i18n';
import type { TargetNote } from './types';

export type Verdict = 'perfect' | 'sharp' | 'flat' | 'wrong' | 'missed';

/** signed cents from `sung` to the nearest octave of `target` (−600..+600) */
export const centsToTarget = centsToNearestOctave;

export { PERFECT_CENTS, SLIGHT_CENTS };
/** beyond this the singer is on a different scale note, not just out of tune */
const WRONG_NOTE_CENTS = 120;
/** the attack is unstable by nature — don't grade the first moments of a note */
const ATTACK_SKIP_SEC = 0.1;
/** nominal frame spacing, used to express coverage as a fraction */
const FRAME_SEC = 0.033;

/* ---- rhythm: when the singer arrives on each note -------------------- */
/** a frame rounding to the target's semitone (any octave) counts as arriving on it */
const ONSET_CENTS = 50;
/** pitch detection settles ~41–53 ms after a step (docs/PITCH_BENCHMARK.md); frames are stamped that late */
const DETECTION_LAG_SEC = 0.05;
/** an onset this close to the beat gets full credit… */
const ONSET_FULL_SEC = 0.15;
/** …falling linearly to none this far from it */
const ONSET_ZERO_SEC = 0.4;
/** notes shorter than this get proportionally tighter tolerances */
const ONSET_REF_NOTE_SEC = 0.4;
/** a silence this long between voiced frames is a re-attack */
const REATTACK_GAP_SEC = 0.08;

export function verdictOfCents(cents: number): Verdict {
  const a = Math.abs(cents);
  if (a > WRONG_NOTE_CENTS) return 'wrong';
  if (a <= PERFECT_CENTS) return 'perfect';
  return cents > 0 ? 'sharp' : 'flat';
}

export const VERDICT_GLYPH: Record<Verdict, string> = {
  perfect: '✓',
  sharp: '△',
  flat: '▽',
  wrong: '✕',
  missed: '·',
};

export const VERDICT_LABEL: Record<Verdict, string> = translatedRecord<Verdict>({
  perfect: 'exercise.verdict.perfect',
  sharp: 'exercise.verdict.sharp',
  flat: 'exercise.verdict.flat',
  wrong: 'exercise.verdict.wrong',
  missed: 'exercise.verdict.missed',
});

export interface NoteResult {
  noteIndex: number;
  verdict: Verdict;
  /** median signed cents over the sustained portion (attack skipped) */
  medianCents: number;
  /** fraction of the note's duration that was voiced, 0..1 */
  coverage: number;
}

export interface PhraseSummary {
  /** average absolute cents deviation across graded notes */
  avgCents: number;
  /** 0..100, higher = steadier (low cents variance) */
  stability: number;
  /** 0..100, how close to the beat the singer arrived on each note */
  rhythm: number;
  /** longest continuously in-tune note, seconds */
  longestStableSec: number;
  /** 0..100 overall */
  score: number;
  results: NoteResult[];
}

export interface GradeFrame {
  /** phrase time, seconds */
  t: number;
  sungMidi: number;
}

/**
 * Frames are appended in time order, so the slice covering a note's window can
 * be found by binary search instead of scanning every frame. That is what
 * keeps live grading O(log n) per completed note rather than O(n) per audio
 * frame.
 */
function framesBetween(frames: GradeFrame[], from: number, to: number): GradeFrame[] {
  let lo = 0;
  let hi = frames.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < from) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;
  hi = frames.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= to) lo = mid + 1;
    else hi = mid;
  }
  return frames.slice(start, lo);
}

interface NoteGrade {
  result: NoteResult;
  /** absolute median cents, or null when the note wasn't graded */
  absCents: number | null;
  /** 0..1 timing credit */
  timing: number;
  longestStableSec: number;
}

/**
 * Timing credit for one note: how far from its start the singer *arrived* on
 * its pitch. An arrival is the first on-pitch frame of a run — the frame
 * before it was off pitch or silent — so carrying the previous pitch, or
 * simply staying voiced, is not mistaken for being on time.
 *
 * A note repeating the previous pitch can only be told apart by a re-attack
 * (a short silence). When there is none — a legato "la" can leave no gap —
 * its timing is unknowable, and it gets the benefit of the doubt.
 *
 * A note sung off pitch is timed by the voice's own re-attack (a silence
 * before it); with none, the voice was carried over from the last note —
 * holding one pitch through a phrase must not pass as keeping time.
 */
function onsetCredit(note: TargetNote, prev: TargetNote | undefined, frames: GradeFrame[]): number {
  const scale = Math.min(1, note.duration / ONSET_REF_NOTE_SEC);
  const fullSec = ONSET_FULL_SEC * scale;
  const zeroSec = Math.max(fullSec + 0.05, ONSET_ZERO_SEC * scale);
  const end = note.start + note.duration;
  const onPitch = (f: GradeFrame) => Math.abs(centsToTarget(f.sungMidi, note.midi)) <= ONSET_CENTS;
  const repeated =
    !!prev &&
    Math.abs(centsToTarget(prev.midi, note.midi)) < 50 &&
    note.start - (prev.start + prev.duration) < REATTACK_GAP_SEC;

  // frames from just before the earliest creditable onset to the note's end
  const from = note.start - zeroSec + DETECTION_LAG_SEC;
  // looks back one gap further, so the first frame in range knows what preceded it
  const candidates = framesBetween(frames, from - REATTACK_GAP_SEC, end + DETECTION_LAG_SEC);
  const credit = (f: GradeFrame) => {
    const error = Math.abs(f.t - DETECTION_LAG_SEC - note.start);
    if (error > zeroSec) return null;
    return error <= fullSec ? 1 : 1 - (error - fullSec) / (zeroSec - fullSec);
  };
  const gapBefore = (i: number) => i === 0 || candidates[i].t - candidates[i - 1].t > REATTACK_GAP_SEC;

  let sungOnPitch = false;
  let reattack: number | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const f = candidates[i];
    if (f.t < from) continue;
    if (reattack === null && gapBefore(i)) reattack = credit(f);
    if (!onPitch(f)) continue;
    sungOnPitch = true;
    const arrives = repeated ? gapBefore(i) : gapBefore(i) || !onPitch(candidates[i - 1]);
    const c = arrives ? credit(f) : null;
    if (c !== null) return c;
  }
  // on pitch, but no arrival near the beat: carried over from the previous
  // note (fine for a repeat) or arrived far too early
  if (sungOnPitch) return repeated ? 1 : 0;
  return reattack ?? 0;
}

/**
 * Grade one target note. `frames` may be the whole phrase or just this note's
 * neighbourhood — the window filter below is the authority either way, so the
 * live path and the final summary always agree.
 */
export function gradeNote(note: TargetNote, noteIndex: number, frames: GradeFrame[], prev?: TargetNote): NoteGrade {
  const winStart = note.start + ATTACK_SKIP_SEC;
  const winEnd = note.start + note.duration;
  const inWindow = framesBetween(frames, winStart, winEnd);

  if (inWindow.length === 0) {
    const anyVoiced = framesBetween(frames, note.start, winEnd).length > 0;
    return {
      result: { noteIndex, verdict: anyVoiced ? 'wrong' : 'missed', medianCents: 0, coverage: 0 },
      absCents: null,
      // a missed note is a timing miss too; a voiced one is judged like any other
      timing: anyVoiced ? onsetCredit(note, prev, frames) : 0,
      longestStableSec: 0,
    };
  }

  const medianCents = median(inWindow.map((f) => centsToTarget(f.sungMidi, note.midi)));
  const coverage = Math.min(1, inWindow.length / Math.max(1, (winEnd - winStart) / FRAME_SEC));

  // longest stretch of this note held within the "slight" band
  let longestStableSec = 0;
  let run = 0;
  let prevT = winStart;
  for (const f of inWindow) {
    if (Math.abs(centsToTarget(f.sungMidi, note.midi)) <= SLIGHT_CENTS) {
      run += f.t - prevT;
      longestStableSec = Math.max(longestStableSec, run);
    } else {
      run = 0;
    }
    prevT = f.t;
  }

  return {
    result: { noteIndex, verdict: verdictOfCents(medianCents), medianCents, coverage },
    absCents: Math.abs(medianCents),
    timing: onsetCredit(note, prev, frames),
    longestStableSec,
  };
}

/** Aggregate per-note grades into the phrase-level summary. */
function summarize(noteCount: number, grades: NoteGrade[]): PhraseSummary {
  const results = grades.map((g) => g.result);
  const allAbsCents = grades.map((g) => g.absCents).filter((c): c is number => c !== null);
  const timings = grades.map((g) => g.timing);
  const longestStableSec = grades.reduce((m, g) => Math.max(m, g.longestStableSec), 0);

  const avgCents = allAbsCents.length ? allAbsCents.reduce((a, b) => a + b, 0) / allAbsCents.length : 0;
  const centsVar = allAbsCents.length
    ? allAbsCents.reduce((a, b) => a + (b - avgCents) ** 2, 0) / allAbsCents.length
    : 0;
  const stability = Math.max(0, Math.round(100 - Math.sqrt(centsVar) * 1.5));
  const rhythm = timings.length ? Math.round((100 * timings.reduce((a, b) => a + b, 0)) / timings.length) : 0;

  const graded = results.filter((r) => r.verdict !== 'missed');
  const perfect = graded.filter((r) => r.verdict === 'perfect').length;
  const slight = graded.filter((r) => r.verdict === 'sharp' || r.verdict === 'flat').length;
  const pitchScore = noteCount ? (100 * (perfect + slight * 0.55)) / noteCount : 0;
  const score = Math.round(pitchScore * 0.7 + rhythm * 0.2 + stability * 0.1);

  return { avgCents, stability, rhythm, longestStableSec, score, results };
}

/** Grade a whole phrase in one pass — used for the end-of-run summary. */
export function gradePhrase(notes: TargetNote[], frames: GradeFrame[]): PhraseSummary {
  return summarize(
    notes.length,
    notes.map((note, i) => gradeNote(note, i, frames, notes[i - 1]))
  );
}

export interface PhraseEvaluator {
  /** feed a voiced, smoothed frame */
  addFrame(t: number, sungMidi: number): void;
  /**
   * Grade every note that has finished by `upto`, in order. Each note is
   * graded exactly once; repeated calls only return newly-completed notes.
   */
  collectCompleted(upto: number): NoteResult[];
  /** phrase summary over everything fed so far */
  summary(): PhraseSummary;
  reset(): void;
}

/**
 * Streaming front-end to the same grading functions: accumulates frames and
 * hands back note verdicts as the playhead passes them.
 *
 * The session hook used to rebuild this by hand every audio frame — filtering
 * the entire (growing) frame array and re-running a whole-phrase grade just to
 * extract one note. That is quadratic in a hot callback on a JS thread this
 * app is already careful about.
 */
export function createPhraseEvaluator(notes: TargetNote[]): PhraseEvaluator {
  const frames: GradeFrame[] = [];
  let gradedUpto = -1;

  return {
    addFrame(t, sungMidi) {
      frames.push({ t, sungMidi });
    },

    collectCompleted(upto) {
      const out: NoteResult[] = [];
      for (let i = gradedUpto + 1; i < notes.length; i++) {
        const n = notes[i];
        if (n.start + n.duration > upto) break;
        out.push(gradeNote(n, i, frames, notes[i - 1]).result);
        gradedUpto = i;
      }
      return out;
    },

    summary() {
      return gradePhrase(notes, frames);
    },

    reset() {
      frames.length = 0;
      gradedUpto = -1;
    },
  };
}
