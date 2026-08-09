/**
 * Turning a finished attempt into a persisted session record, including the
 * per-pitch-class tallies the heatmap needs.
 *
 * The pieces below are deliberately expressed in terms of "a scored subject
 * and a list of graded notes" rather than "a staff-practice phrase". Progress
 * tracking is meant to accumulate across every practice mode, and the previous
 * shape could only ever accept a melody `PhraseSummary` — an ear-training
 * round had no way in, which is why none of them are recorded today.
 */
import { pitchClassOf } from '@/shared/lib/music';
import type { Exercise } from '@/entities/exercise';
import type { NoteTally, SessionRecord } from '../model/progressStore';

export interface PhraseLike {
  score: number;
  avgCents: number;
  stability: number;
  rhythm: number;
  results: { noteIndex: number; verdict: string; medianCents: number }[];
}

/** What was attempted — an exercise, a drill, anything with an identity. */
export interface AttemptSubject {
  id: string;
  title: string;
}

/** One graded note from any exercise type. */
export interface GradedNote {
  /** the *target* pitch, which is what tendencies are attributed to */
  midi: number;
  /** signed cents the singer was off by (positive = sharp) */
  medianCents: number;
  perfect: boolean;
}

/** Headline numbers every attempt reports, whatever produced them. */
export interface AttemptScores {
  score: number;
  avgCents: number;
  stability: number;
  rhythm: number;
  /** seconds of singing; omit when the mode has no meaningful duration */
  durationSec?: number;
}

export function starsForScore(score: number): number {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 55) return 1;
  return 0;
}

/** Accumulate signed-cents tendencies per pitch class. */
export function tallyByPitchClass(notes: GradedNote[]): Record<number, NoteTally> {
  const tallies: Record<number, NoteTally> = {};
  for (const note of notes) {
    const pc = pitchClassOf(note.midi);
    const cur = tallies[pc] ?? { centsSum: 0, count: 0, perfect: 0 };
    tallies[pc] = {
      centsSum: cur.centsSum + note.medianCents,
      count: cur.count + 1,
      perfect: cur.perfect + (note.perfect ? 1 : 0),
    };
  }
  return tallies;
}

const emptyTally = (): NoteTally => ({ centsSum: 0, count: 0, perfect: 0 });

function addTo(tallies: Record<string | number, NoteTally>, key: string | number, note: GradedNote): void {
  const cur = tallies[key] ?? emptyTally();
  tallies[key] = {
    centsSum: cur.centsSum + note.medianCents,
    count: cur.count + 1,
    perfect: cur.perfect + (note.perfect ? 1 : 0),
  };
}

/** Accumulate per exact target MIDI note — the register signal. */
export function tallyByMidi(sequences: GradedNote[][]): Record<number, NoteTally> {
  const tallies: Record<number, NoteTally> = {};
  for (const seq of sequences) for (const note of seq) addTo(tallies, note.midi, note);
  return tallies;
}

/**
 * Accumulate per melodic interval, keyed by signed semitones (`"-3"` =
 * descending minor third). Credited to the landing note, since that is what
 * an interval miss measures.
 *
 * Only *consecutive* notes within one sequence form an interval — which is
 * why the input is a list of sequences rather than one flat list. Chaining
 * across a round or phrase boundary would invent leaps nobody sang.
 */
export function tallyByInterval(sequences: GradedNote[][]): Record<string, NoteTally> {
  const tallies: Record<string, NoteTally> = {};
  for (const seq of sequences) {
    for (let i = 1; i < seq.length; i++) {
      const semitones = seq[i].midi - seq[i - 1].midi;
      if (semitones === 0) continue; // a repeated note is not an interval
      addTo(tallies, `${semitones > 0 ? '+' : ''}${semitones}`, seq[i]);
    }
  }
  return tallies;
}

export interface AttemptExtras {
  /**
   * Runs of graded notes that are genuinely melodic: true MIDI pitches, in the
   * order they were sung, one array per unbroken phrase. Supplying this opts
   * the attempt into register and interval tracking.
   *
   * Callers whose `GradedNote.midi` is anything other than a real pitch (ear
   * training's single-target rounds put a pitch class there) must omit it.
   */
  melodicSequences?: GradedNote[][];
}

/** Assemble a persistable record from mode-agnostic parts. */
export function buildAttemptRecord(
  subject: AttemptSubject,
  scores: AttemptScores,
  graded: GradedNote[],
  at = Date.now(),
  extras: AttemptExtras = {}
): SessionRecord {
  const sequences = extras.melodicSequences;
  const hasMelodic = sequences !== undefined && sequences.some((s) => s.length > 0);

  return {
    exerciseId: subject.id,
    exerciseTitle: subject.title,
    at,
    score: scores.score,
    stars: starsForScore(scores.score),
    avgCents: Math.round(scores.avgCents),
    stability: scores.stability,
    rhythm: scores.rhythm,
    durationSec: scores.durationSec,
    notes: tallyByPitchClass(graded),
    ...(hasMelodic
      ? { notesByMidi: tallyByMidi(sequences), intervals: tallyByInterval(sequences) }
      : {}),
  };
}

/** Sung length of a phrase in real seconds, accounting for slow playback. */
export function phraseSeconds(exercise: Exercise, rate = 1): number {
  const end = exercise.notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0);
  return end / rate;
}

/**
 * Melody-practice adapter: maps a phrase summary onto the generic record.
 * Notes the singer never attempted ('missed') carry no tendency information,
 * so they are left out of the tallies.
 */
export function buildSessionRecord(exercise: Exercise, summary: PhraseLike, at = Date.now(), rate = 1): SessionRecord {
  const graded: GradedNote[] = [];

  // A melody is one ordered run of true MIDI targets — the ideal source for
  // register and interval tracking. But a missed note has to *break* the run,
  // not merely be skipped: closing the gap would join its neighbours into a
  // leap the singer never attempted, and that fake interval would then be
  // reported back to them as a weak spot.
  const sequences: GradedNote[][] = [];
  let run: GradedNote[] = [];
  const breakRun = () => {
    if (run.length > 0) sequences.push(run);
    run = [];
  };

  let prevIndex: number | null = null;
  for (const r of summary.results) {
    const target = exercise.notes[r.noteIndex];
    if (r.verdict === 'missed' || !target) {
      breakRun();
      prevIndex = r.noteIndex;
      continue;
    }
    const note: GradedNote = { midi: target.midi, medianCents: r.medianCents, perfect: r.verdict === 'perfect' };
    graded.push(note);
    // non-adjacent targets aren't a melodic step either
    if (prevIndex !== null && r.noteIndex !== prevIndex + 1) breakRun();
    run.push(note);
    prevIndex = r.noteIndex;
  }
  breakRun();

  return buildAttemptRecord(
    { id: exercise.id, title: exercise.title },
    { ...summary, durationSec: Math.round(phraseSeconds(exercise, rate)) },
    graded,
    at,
    { melodicSequences: sequences }
  );
}
