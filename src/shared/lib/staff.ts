/**
 * Treble-clef staff geometry: maps MIDI pitch to a vertical position using
 * *diatonic* staff steps (so note heads land on the right lines/spaces), plus
 * continuous mapping for the smooth sung-pitch overlay. Pure, no rendering.
 *
 * Lives in `shared/lib` rather than a single feature because it has no
 * exercise/melody coupling — staff-practice's timeline renderer and the
 * vocal-range/onboarding live-note staff both need the same MIDI→geometry
 * math, just laid out differently.
 */
import { midiToName } from './music';

// diatonic index of each pitch class (sharps share the natural's staff line)
const PC_DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const PC_IS_SHARP = [false, true, false, true, false, false, true, false, true, false, true, false];

/** staff step: diatonic steps above C-1; C4=28, E4(bottom line)=30, F5(top line)=38 */
export function staffStep(midi: number): number {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return PC_DIATONIC[pc] + 7 * octave;
}

export const STAFF_LINE_STEPS = [30, 32, 34, 36, 38]; // E4 G4 B4 D5 F5
export const MIDDLE_C_STEP = 28; // C4 — one ledger line below the staff

export function isSharp(midi: number): boolean {
  return PC_IS_SHARP[((midi % 12) + 12) % 12];
}

/** Note label as the staff has always rendered it, with an ASCII sharp. */
export function noteName(midi: number): string {
  return midiToName(midi, 'ascii');
}

/**
 * A staff layout for a given pixel geometry. `lineGap` is the distance between
 * adjacent staff lines; one diatonic step is half that.
 */
export interface StaffLayout {
  /** y of the bottom staff line (E4, step 30) */
  baselineY: number;
  lineGap: number;
}

export function yOfStep(step: number, layout: StaffLayout): number {
  return layout.baselineY - (step - 30) * (layout.lineGap / 2);
}

export function yOfMidi(midi: number, layout: StaffLayout): number {
  return yOfStep(staffStep(midi), layout);
}

/** continuous vertical position for a fractional MIDI value (smooth overlay) */
export function yOfMidiContinuous(midi: number, layout: StaffLayout): number {
  const lo = Math.floor(midi);
  const yLo = yOfMidi(lo, layout);
  const yHi = yOfMidi(lo + 1, layout);
  return yLo + (yHi - yLo) * (midi - lo);
}

/** ledger-line steps a note head needs (even steps outside the 30-38 staff) */
export function ledgerSteps(midi: number): number[] {
  const step = staffStep(midi);
  const out: number[] = [];
  if (step <= 29) {
    for (let s = 28; s >= step - (step % 2); s -= 2) out.push(s);
  } else if (step >= 39) {
    for (let s = 40; s <= step + (step % 2); s += 2) out.push(s);
  }
  return out;
}
