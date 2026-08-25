/**
 * A reanimated shared value that carries the live mic RMS level from any pitch
 * detection pipeline to the MicGlow overlay — entirely on the UI thread, with
 * zero React re-renders.
 *
 * Producers call `micRms.value = frame.rms` from their onFrame callback.
 * MicGlow reads `micRms` inside a `useAnimatedStyle`.
 */
import { makeMutable } from 'react-native-reanimated';

export const micRms = makeMutable(0);
export const micActive = makeMutable(false);

/**
 * Glow color tier driven by pitch accuracy. Producers write one of:
 *   0 = no pitch data (default blue)
 *   1 = in tune (green/accent)
 *   2 = slightly off (orange)
 *   3 = off (red)
 */
export const micGlowTier = makeMutable(0);

/** Map a cents deviation to a glow tier. Call from JS onFrame callbacks. */
export function centsToGlowTier(cents: number | null): number {
  if (cents === null) return 0;
  const a = Math.abs(cents);
  if (a <= 12) return 1;  // PERFECT_CENTS
  if (a <= 30) return 2;  // SLIGHT_CENTS
  return 3;
}
