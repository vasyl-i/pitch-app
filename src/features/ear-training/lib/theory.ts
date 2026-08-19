/**
 * Music-theory content for ear training: chord formulas, interval names,
 * and generated melodic material. Pure and dependency-free apart from the
 * shared music helpers — everything here is deterministic given its inputs
 * except where it explicitly takes randomness.
 *
 * All generated content is original (random diatonic material), never quoted
 * from recordings — see the product's content policy.
 */
import { pitchClassName } from '@/shared/lib/music';

/* ------------------------------------------------------------------ *
 * Chords                                                              *
 * ------------------------------------------------------------------ */

export type ChordTypeId = 'maj' | 'min' | 'aug' | 'dim' | 'dom7' | 'maj7' | 'min7';

export interface ChordType {
  id: ChordTypeId;
  label: string;
  /** semitones above the root, root included */
  intervals: number[];
}

export const CHORD_TYPES: Record<ChordTypeId, ChordType> = {
  maj: { id: 'maj', label: 'Major', intervals: [0, 4, 7] },
  min: { id: 'min', label: 'Minor', intervals: [0, 3, 7] },
  aug: { id: 'aug', label: 'Augmented', intervals: [0, 4, 8] },
  dim: { id: 'dim', label: 'Diminished', intervals: [0, 3, 6] },
  dom7: { id: 'dom7', label: 'Dominant 7', intervals: [0, 4, 7, 10] },
  maj7: { id: 'maj7', label: 'Major 7', intervals: [0, 4, 7, 11] },
  min7: { id: 'min7', label: 'Minor 7', intervals: [0, 3, 7, 10] },
};

/** Chord-member name for a result row, e.g. "root", "third", "seventh". */
export function chordDegreeName(semitonesAboveRoot: number): string {
  switch (semitonesAboveRoot) {
    case 0:
      return 'root';
    case 3:
    case 4:
      return 'third';
    case 6:
    case 7:
    case 8:
      return 'fifth';
    default:
      return 'seventh';
  }
}

export function chordMidis(rootMidi: number, type: ChordTypeId): number[] {
  return CHORD_TYPES[type].intervals.map((i) => rootMidi + i);
}

/* ------------------------------------------------------------------ *
 * Intervals                                                           *
 * ------------------------------------------------------------------ */

export interface IntervalSpec {
  semitones: number;
  label: string;
}

export const INTERVALS: IntervalSpec[] = [
  { semitones: 1, label: 'Minor second' },
  { semitones: 2, label: 'Major second' },
  { semitones: 3, label: 'Minor third' },
  { semitones: 4, label: 'Major third' },
  { semitones: 5, label: 'Perfect fourth' },
  { semitones: 6, label: 'Tritone' },
  { semitones: 7, label: 'Perfect fifth' },
  { semitones: 8, label: 'Minor sixth' },
  { semitones: 9, label: 'Major sixth' },
  { semitones: 10, label: 'Minor seventh' },
  { semitones: 11, label: 'Major seventh' },
  { semitones: 12, label: 'Octave' },
];

export function intervalLabel(semitones: number): string {
  return INTERVALS.find((i) => i.semitones === Math.abs(semitones))?.label ?? `${semitones} semitones`;
}

/* ------------------------------------------------------------------ *
 * Random helpers                                                      *
 * ------------------------------------------------------------------ */

export function randomInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Random midi inside the range whose pitch class differs from `avoidPc`, so
 * back-to-back rounds never repeat the same answer. Falls back to any midi
 * when the range is a single pitch class wide.
 */
export function randomMidiAvoiding(low: number, high: number, avoidPc?: number): number {
  let midi = randomInt(low, high);
  if (avoidPc !== undefined && midi % 12 === avoidPc && high > low) {
    const shifted = midi + randomInt(1, Math.min(6, high - low));
    midi = shifted > high ? low + ((shifted - low) % (high - low)) : shifted;
    if (midi % 12 === avoidPc) midi = midi < high ? midi + 1 : low;
  }
  return midi;
}

/* ------------------------------------------------------------------ *
 * Melodies                                                            *
 * ------------------------------------------------------------------ */

export interface MelodyNote {
  midi: number;
  /** melody-relative start, seconds */
  start: number;
  /** seconds */
  duration: number;
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** step lengths melodies are built from; mostly even, some long notes */
const SHORT_BEAT = 0.45;
const LONG_BEAT = 0.9;

/**
 * Original short melody: a stepwise-biased random walk on a major scale,
 * fitted inside the singer's range. Steps dominate so the result is singable;
 * the occasional third keeps it from sounding like a scale drill.
 */
export function generateMelody(noteCount: number, range: { low: number; high: number }): MelodyNote[] {
  const tonic = randomInt(range.low, Math.max(range.low, range.high - 9));
  // scale degrees available without leaving the range
  const degrees: number[] = [];
  for (let oct = 0; oct < 2; oct++) {
    for (const step of MAJOR_SCALE) {
      const midi = tonic + oct * 12 + step;
      if (midi >= range.low && midi <= range.high) degrees.push(midi);
    }
  }
  if (degrees.length < 3) degrees.push(tonic, tonic + 2, tonic + 4);

  let index = degrees.indexOf(tonic);
  if (index < 0) index = 0;
  const notes: MelodyNote[] = [];
  let t = 0;
  for (let i = 0; i < noteCount; i++) {
    const isLast = i === noteCount - 1;
    const duration = isLast || Math.random() < 0.25 ? LONG_BEAT : SHORT_BEAT;
    notes.push({ midi: degrees[index], start: t, duration });
    t += duration + 0.06; // small articulation gap
    const stride = Math.random() < 0.75 ? 1 : 2;
    const dir = Math.random() < 0.5 ? -1 : 1;
    index = Math.min(degrees.length - 1, Math.max(0, index + dir * stride));
  }
  return notes;
}

/**
 * Degree patterns for "finish the melody": every pattern implies a strong
 * resolution, and the hidden final note is always the tonic — one clearly
 * correct answer, which is what makes the exercise fair to grade.
 * Degrees are 1-based major-scale degrees; 0 means the leading tone below.
 */
const FINISH_PATTERNS: number[][] = [
  [5, 4, 3, 2, 1],
  [1, 2, 3, 2, 1],
  [3, 2, 1, 0, 1],
  [1, 3, 5, 2, 1],
  [5, 6, 5, 2, 1],
];

export interface FinishMelody {
  /** the notes that are played (final note omitted) */
  played: MelodyNote[];
  /** the full melody including the hidden final note */
  full: MelodyNote[];
  /** midi of the hidden final note */
  answerMidi: number;
}

export function generateFinishMelody(range: { low: number; high: number }): FinishMelody {
  const pattern = pick(FINISH_PATTERNS);
  // tonic placed so degree 6 and the leading tone below both fit
  const tonic = randomInt(range.low + 1, Math.max(range.low + 1, range.high - 9));
  const toMidi = (degree: number) => (degree === 0 ? tonic - 1 : tonic + MAJOR_SCALE[degree - 1]);

  const full: MelodyNote[] = [];
  let t = 0;
  for (let i = 0; i < pattern.length; i++) {
    const duration = i === pattern.length - 1 ? LONG_BEAT : SHORT_BEAT;
    full.push({ midi: toMidi(pattern[i]), start: t, duration });
    t += duration + 0.06;
  }
  return { played: full.slice(0, -1), full, answerMidi: full[full.length - 1].midi };
}

/* ------------------------------------------------------------------ *
 * Display helpers                                                     *
 * ------------------------------------------------------------------ */

/** "C", "F♯" — sharp spelling, consistent with the rest of ear training. */
export const noteName = pitchClassName;
