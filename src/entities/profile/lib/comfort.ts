/**
 * Deriving the day-to-day comfortable range from the physical extremes a
 * detection pass measured. Kept separate from `range.ts` (voice type /
 * prompt register) because this is specifically about the maximum→comfort
 * relationship the profile store needs when it resets or re-derives.
 */
import type { PitchRange } from '@/shared/lib/music';

/** inset from each measured extreme so content doesn't park the singer at their limits */
const COMFORT_INSET_SEMITONES = 2;
/** never derive a comfort range narrower than this */
const MIN_COMFORT_SPAN = 7;

export function deriveComfortRange(maximumRange: PitchRange): PitchRange {
  const low = maximumRange.lowMidi + COMFORT_INSET_SEMITONES;
  const high = maximumRange.highMidi - COMFORT_INSET_SEMITONES;
  if (high - low >= MIN_COMFORT_SPAN) return { lowMidi: low, highMidi: high };
  // the measured span itself is narrow (or noisy) — don't inset past sanity
  return { lowMidi: maximumRange.lowMidi, highMidi: maximumRange.highMidi };
}
