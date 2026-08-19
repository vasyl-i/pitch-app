/**
 * React binding for `createNoteStabilizer`.
 *
 * Kept separate from the stabilizer itself so the logic stays pure and testable
 * under `node --test` without a React runtime.
 */
import { useMemo, useRef } from 'react';
import { createNoteStabilizer, DEFAULT_NOTE_HYSTERESIS_SEMITONES, type NoteStabilizer } from '@/shared/lib/noteStabilizer';

/**
 * The integer MIDI note to display for a live pitch, held steady across small
 * excursions around a note boundary.
 *
 * Pass the *raw* pitch. This hook returns only a note number for display; it
 * never modifies the value it is given, and nothing derived from it should be
 * fed back into scoring.
 *
 * Advancing the stabilizer inside `useMemo` is safe because `push` is
 * idempotent: a repeated render with the same pitch returns the same note and
 * leaves the state unchanged, so React rendering twice cannot make the display
 * drift.
 */
export function useStabilizedNote(
  midi: number | null,
  hysteresisSemitones: number = DEFAULT_NOTE_HYSTERESIS_SEMITONES
): number | null {
  const ref = useRef<NoteStabilizer | null>(null);
  const stabilizer = (ref.current ??= createNoteStabilizer(hysteresisSemitones));
  return useMemo(() => stabilizer.push(midi), [stabilizer, midi]);
}
