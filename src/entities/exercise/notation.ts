/**
 * A compact text form for long melodies, so a whole song reads as a few lines
 * rather than hundreds of tuples.
 *
 *   `E4:1:Ніч D4:0.5 -:2 F#4:1.5:змо`
 *
 * Each token is `pitch:beats[:lyric]`, separated by whitespace. A pitch is a
 * letter, an optional `#` and an octave (C4 = MIDI 60); `-` is a rest of that
 * many beats. An `_` in a lyric stands for a space ("в_гай" → "в гай").
 */
import type { TargetNote } from './types';

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PITCH = /^([A-G])(#?)(-?\d)$/;

export function notation(bpm: number, text: string): TargetNote[] {
  const beat = 60 / bpm;
  const notes: TargetNote[] = [];
  let t = 0;
  for (const token of text.trim().split(/\s+/)) {
    const [pitch, beatsText, lyric] = token.split(':');
    const beats = Number(beatsText);
    if (!(beats > 0)) throw new Error(`notation: bad length in "${token}"`);
    if (pitch !== '-') {
      const m = PITCH.exec(pitch);
      if (!m) throw new Error(`notation: bad pitch in "${token}"`);
      const midi = 12 * (Number(m[3]) + 1) + PITCH_CLASS[m[1]] + (m[2] ? 1 : 0);
      notes.push({ midi, start: +t.toFixed(3), duration: +(beats * beat).toFixed(3), ...(lyric && { lyric: lyric.replace(/_/g, ' ') }) });
    }
    t += beats * beat;
  }
  return notes;
}
