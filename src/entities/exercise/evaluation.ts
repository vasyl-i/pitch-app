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

export const VERDICT_LABEL: Record<Verdict, string> = {
  perfect: 'Perfect',
  sharp: 'Slightly sharp',
  flat: 'Slightly flat',
  wrong: 'Wrong note',
  missed: 'Missed',
};

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
  /** 0..100, fraction of notes sung on time (voiced during their window) */
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
  onTime: boolean;
  longestStableSec: number;
}

/**
 * Grade one target note. `frames` may be the whole phrase or just this note's
 * neighbourhood — the window filter below is the authority either way, so the
 * live path and the final summary always agree.
 */
export function gradeNote(note: TargetNote, noteIndex: number, frames: GradeFrame[]): NoteGrade {
  const winStart = note.start + ATTACK_SKIP_SEC;
  const winEnd = note.start + note.duration;
  const inWindow = framesBetween(frames, winStart, winEnd);

  if (inWindow.length === 0) {
    const anyVoiced = framesBetween(frames, note.start, winEnd).length > 0;
    return {
      result: { noteIndex, verdict: anyVoiced ? 'wrong' : 'missed', medianCents: 0, coverage: 0 },
      absCents: null,
      onTime: false,
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
    onTime: true,
    longestStableSec,
  };
}

/** Aggregate per-note grades into the phrase-level summary. */
function summarize(noteCount: number, grades: NoteGrade[]): PhraseSummary {
  const results = grades.map((g) => g.result);
  const allAbsCents = grades.map((g) => g.absCents).filter((c): c is number => c !== null);
  const onTimeCount = grades.filter((g) => g.onTime).length;
  const longestStableSec = grades.reduce((m, g) => Math.max(m, g.longestStableSec), 0);

  const avgCents = allAbsCents.length ? allAbsCents.reduce((a, b) => a + b, 0) / allAbsCents.length : 0;
  const centsVar = allAbsCents.length
    ? allAbsCents.reduce((a, b) => a + (b - avgCents) ** 2, 0) / allAbsCents.length
    : 0;
  const stability = Math.max(0, Math.round(100 - Math.sqrt(centsVar) * 1.5));
  const rhythm = noteCount ? Math.round((100 * onTimeCount) / noteCount) : 0;

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
    notes.map((note, i) => gradeNote(note, i, frames))
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
        out.push(gradeNote(n, i, frames).result);
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
