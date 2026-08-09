/**
 * Music-theory helpers. Pure, dependency-free — the single source of truth for
 * pitch naming, frequency/MIDI conversion and cents math across all features.
 *
 * Accidental glyphs: two spellings are kept deliberately. `'ascii'` ("F#4") is
 * what the staff renderer and its readouts have always shown; `'unicode'`
 * ("F♯4") is what the range/ear-training surfaces show. Call sites pick the
 * style they already displayed — this module does not unify them, it just
 * stops each surface from carrying its own copy of the name table.
 */

export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface NoteInfo {
  /** e.g. "A3" */
  name: string;
  /** e.g. "A" */
  pitchClass: string;
  /** pitch-class index 0-11 (C=0) */
  pitchClassIndex: number;
  /** scientific pitch notation octave */
  octave: number;
  /** deviation from the equal-tempered note center, -50..+50 */
  cents: number;
  /** continuous MIDI value, e.g. 57.03 */
  midi: number;
}

export type AccidentalStyle = 'ascii' | 'unicode';

/**
 * An inclusive span of MIDI pitches. Structural on purpose: the profile entity
 * owns the singer's measured range and the exercise entity owns fitting
 * content into a range, and this lets them agree without depending on each
 * other.
 */
export interface PitchRange {
  lowMidi: number;
  highMidi: number;
}

const SHARP_ASCII = PITCH_CLASSES;
const SHARP_DISPLAY = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
const FLAT_DISPLAY = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

/** Sharp pitch-class names, e.g. for axis labels. Prefer `pitchClassName`. */
export const SHARP_PITCH_NAMES: readonly string[] = SHARP_DISPLAY;

// Keys whose signature is written with flats (circle of fifths).
const FLAT_MAJOR_ROOTS = [5, 10, 3, 8, 1, 6]; // F, B♭, E♭, A♭, D♭, G♭
const FLAT_MINOR_ROOTS = [2, 7, 0, 5, 10, 3]; // d, g, c, f, b♭, e♭

/** Normalize any integer/float MIDI value to a pitch class 0-11. */
export function pitchClassOf(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/** Scientific-notation octave of a MIDI value (C4 = 60 → 4). */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

/** Pitch-class name in the requested accidental style, e.g. "F♯" or "F#". */
export function pitchClassName(midi: number, style: AccidentalStyle = 'unicode'): string {
  return (style === 'ascii' ? SHARP_ASCII : SHARP_DISPLAY)[pitchClassOf(midi)];
}

/** Full note name with octave, e.g. "F♯4" / "F#4". */
export function midiToName(midi: number, style: AccidentalStyle = 'unicode'): string {
  return `${pitchClassName(midi, style)}${octaveOf(midi)}`;
}

/** Does this key's signature use flats? `keyName` e.g. "C minor", "F major". */
export function keyUsesFlats(keyName: string): boolean {
  const [root, quality] = keyName.split(' ');
  const pc = PITCH_CLASSES.indexOf(root as (typeof PITCH_CLASSES)[number]);
  return quality === 'minor' ? FLAT_MINOR_ROOTS.includes(pc) : FLAT_MAJOR_ROOTS.includes(pc);
}

/** Theory-correct display spelling for a pitch class in the given key (A♭ in C minor, G♯ in A major). */
export function spellPitchClass(pc: number, keyName: string): string {
  return (keyUsesFlats(keyName) ? FLAT_DISPLAY : SHARP_DISPLAY)[((pc % 12) + 12) % 12];
}

/** Display spelling for a chord (root + maj/min quality) in the given key, e.g. "A♭", "Cm". */
export function spellChord(rootPc: number, quality: 'maj' | 'min', keyName: string): string {
  return spellPitchClass(rootPc, keyName) + (quality === 'min' ? 'm' : '');
}

export function freqToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToNote(frequency: number): NoteInfo {
  const midi = freqToMidi(frequency);
  const nearest = Math.round(midi);
  const pitchClassIndex = ((nearest % 12) + 12) % 12;
  const octave = Math.floor(nearest / 12) - 1;
  const pitchClass = PITCH_CLASSES[pitchClassIndex];
  return {
    name: `${pitchClass}${octave}`,
    pitchClass,
    pitchClassIndex,
    octave,
    cents: Math.round((midi - nearest) * 100),
    midi,
  };
}

/**
 * Signed cents from `sungMidi` to the nearest octave of `targetMidi`
 * (−600..+600). Octave-agnostic on purpose: singers answer in their own
 * register, so a bass echoing a soprano's A5 with A2 is correct.
 *
 * Used by every scorer in the app — melody grading and ear-training sing-back
 * alike — so "how far off was that note" means exactly one thing everywhere.
 */
export function centsToNearestOctave(sungMidi: number, targetMidi: number): number {
  let d = (sungMidi - targetMidi) % 12;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d * 100;
}

/**
 * Intonation tolerance bands, in cents. These are app-wide tuning: melody
 * grading, the staff overlay colours, the live readout and ear-training
 * sing-back all draw the line between "in tune", "close" and "off" here, and
 * they must agree or the same note gets two different judgements on two
 * screens.
 */
export const PERFECT_CENTS = 12;
export const SLIGHT_CENTS = 30;
/** beyond this a deviation reads as "noticeably" out, not just slightly */
export const NOTICEABLE_CENTS = 60;

/**
 * Four-tier color for a cents deviation, used by every live pitch
 * visualization (onboarding detection, the staff overlay, the readouts) so
 * "how far off is this" always maps to the same color. `null` means no pitch
 * detected. Uses the app's lime accent for "in tune" rather than a literal
 * green, to stay consistent with the rest of the UI's brand color.
 */
export function colorForCents(cents: number | null): string {
  if (cents === null) return 'rgba(255,255,255,0.4)';
  const a = Math.abs(cents);
  if (a <= PERFECT_CENTS) return '#C8DA59'; // in tune
  if (a <= SLIGHT_CENTS) return '#e8c97a'; // slightly sharp/flat
  if (a <= NOTICEABLE_CENTS) return '#f0954a'; // noticeable deviation
  return '#ff6d5c'; // out of tune
}

/** Median of a numeric list (lower median for even lengths). Does not mutate. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
