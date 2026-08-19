/**
 * Interpreting the singer's measured range: voice-type estimate and the
 * comfortable sub-range generated content should target. Pure functions.
 */
import type { PitchRange } from '@/shared/lib/music';

/**
 * Rough voice-type label from the low note. Deliberately hedged ("≈") — real
 * classification depends on tessitura and timbre, not just extremes.
 */
export function voiceType(range: PitchRange): string {
  const low = range.lowMidi;
  if (low <= 43) return 'Bass';
  if (low <= 47) return 'Baritone';
  if (low <= 51) return 'Tenor';
  if (low <= 55) return 'Alto';
  if (low <= 59) return 'Mezzo-soprano';
  return 'Soprano';
}

export function rangeSemitones(range: PitchRange): number {
  return range.highMidi - range.lowMidi;
}

/** playback register used when no range has been measured: A3–A4 */
export const DEFAULT_PROMPT_RANGE: PitchRange = { lowMidi: 57, highMidi: 69 };

/**
 * Comfortable sub-range for generated prompts: inset from the extremes, and
 * never wider than about an octave so drills stay singable.
 */
export function promptRange(range: PitchRange | null): { low: number; high: number } {
  if (!range) return { low: DEFAULT_PROMPT_RANGE.lowMidi, high: DEFAULT_PROMPT_RANGE.highMidi };
  const inset = 2;
  const low = range.lowMidi + inset;
  const high = Math.max(low + 5, range.highMidi - inset);
  if (high - low > 14) {
    const centre = Math.round((low + high) / 2);
    return { low: centre - 7, high: centre + 7 };
  }
  return { low, high };
}
