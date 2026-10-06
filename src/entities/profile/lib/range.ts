/**
 * Interpreting the singer's measured range: voice-type estimate and the
 * comfortable sub-range generated content should target. Pure functions.
 */
import type { PitchRange } from '@/shared/lib/music';

/**
 * Voice-type estimate from measured range. Uses both low and high extremes
 * to distinguish sub-types. Deliberately hedged ("≈") — real classification
 * depends on tessitura and timbre, not just extremes.
 *
 * Male-leaning voices (low ≤ E3 / MIDI 52):
 *   Bass          low ≤ E2 (40)
 *   Bass-baritone low ≤ A2 (45), high ≤ E4 (64)
 *   Baritone      low ≤ A2 (45)
 *   Tenor         low ≤ E3 (52)
 *
 * Female-leaning voices (low > E3):
 *   Contralto     low ≤ G3 (55), high ≤ E5 (76)
 *   Alto          low ≤ G3 (55)
 *   Mezzo-soprano low ≤ B3 (59)
 *   Soprano       low > B3
 *   Coloratura    low > B3, high ≥ C6 (84)
 */
export function voiceType(range: PitchRange): string {
  const { lowMidi: low, highMidi: high } = range;

  // Male-leaning
  if (low <= 40) return 'Bass';
  if (low <= 45 && high <= 64) return 'Bass-baritone';
  if (low <= 45) return 'Baritone';
  if (low <= 52) return 'Tenor';

  // Female-leaning
  if (low <= 55 && high <= 76) return 'Contralto';
  if (low <= 55) return 'Alto';
  if (low <= 59) return 'Mezzo-soprano';
  if (high >= 84) return 'Coloratura soprano';
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
