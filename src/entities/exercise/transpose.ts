/**
 * Fitting exercise content to a singer's range. Pure functions.
 *
 * Takes a structural `PitchRange` rather than the profile entity's stored
 * range, so transposition stays a property of the exercise domain and doesn't
 * drag a dependency on the user profile along with it.
 */
import { PITCH_CLASSES, SHARP_PITCH_NAMES, type PitchRange } from '@/shared/lib/music';
import type { Exercise } from './types';

export interface Transposition {
  /** semitones to shift the exercise (0 = original) */
  shift: number;
  /** true when the shifted melody sits fully inside the range */
  fits: boolean;
}

/** a little headroom so the singer isn't parked at their extremes */
const RANGE_MARGIN = 1;

function bounds(exercise: Exercise) {
  const midis = exercise.notes.map((n) => n.midi);
  return { lo: Math.min(...midis), hi: Math.max(...midis) };
}

function usable(range: PitchRange) {
  return { low: range.lowMidi + RANGE_MARGIN, high: range.highMidi - RANGE_MARGIN };
}

/**
 * Pick the transposition that best centres a melody in the singer's range.
 * Keeps the original when it already fits comfortably, so we don't move
 * content around for no reason.
 */
export function fitToRange(exercise: Exercise, range: PitchRange | null): Transposition {
  if (!range) return { shift: 0, fits: true };

  const { lo, hi } = bounds(exercise);
  const { low: usableLow, high: usableHigh } = usable(range);

  if (lo >= usableLow && hi <= usableHigh) return { shift: 0, fits: true };

  const melodyCentre = (lo + hi) / 2;
  const rangeCentre = (usableLow + usableHigh) / 2;
  let shift = Math.round(rangeCentre - melodyCentre);

  // if it can fit, nudge the shift so nothing spills past either end
  const span = hi - lo;
  if (span <= usableHigh - usableLow) {
    if (lo + shift < usableLow) shift = Math.ceil(usableLow - lo);
    if (hi + shift > usableHigh) shift = Math.floor(usableHigh - hi);
  }

  const fits = lo + shift >= usableLow && hi + shift <= usableHigh;
  return { shift, fits };
}

/**
 * How many keys, a semitone apart, the whole exercise fits in within the
 * range — the most rounds a key ladder can climb. At least one (an exercise
 * wider than the range still gets its best-fit key); unbounded without a
 * measured range.
 */
export function ladderRoom(exercise: Exercise, range: PitchRange | null): number {
  if (!range) return Infinity;
  const { lo, hi } = bounds(exercise);
  const { low, high } = usable(range);
  return Math.max(1, high - low - (hi - lo) + 1);
}

/**
 * Transpositions for `rounds` rounds of a scale or arpeggio, climbing a
 * semitone per round — the pattern keeps its own tonality (a major scale is a
 * major scale in every key), only the tonic rises. The climb never leaves the
 * range, so it may be shorter than asked; it sits in the middle of the room
 * the range leaves, lowest key first. Without a range it climbs from the
 * authored key.
 */
export function keyLadder(exercise: Exercise, range: PitchRange | null, rounds: number): number[] {
  const count = Math.max(1, Math.min(rounds, ladderRoom(exercise, range)));
  if (!range) return Array.from({ length: count }, (_, i) => i);
  if (count === 1) return [fitToRange(exercise, range).shift];
  const { lo, hi } = bounds(exercise);
  const { low, high } = usable(range);
  // every shift in [lowest, highest] keeps the exercise inside the range
  const lowest = low - lo;
  const highest = high - hi;
  const start = lowest + Math.floor((highest - lowest - (count - 1)) / 2);
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Transpose the key label along with the notes, e.g. "C major" +2 -> "D major" */
export function transposeKeyLabel(key: string, shift: number): string {
  if (shift === 0) return key;
  const [root, ...rest] = key.split(' ');
  const idx = SHARP_PITCH_NAMES.findIndex((n) => n === root || n.replace('♯', '#') === root);
  if (idx < 0) return key;
  const next = SHARP_PITCH_NAMES[(((idx + shift) % 12) + 12) % 12];
  return [next, ...rest].join(' ');
}

export function transposeExercise(exercise: Exercise, shift: number): Exercise {
  if (shift === 0) return exercise;
  return {
    ...exercise,
    key: transposeKeyLabel(exercise.key, shift),
    notes: exercise.notes.map((n) => ({ ...n, midi: n.midi + shift })),
  };
}

// `PITCH_CLASSES` is re-exported for callers that need the ASCII spelling the
// exercise library authors keys with (e.g. "C major", "F# minor").
export { PITCH_CLASSES };
