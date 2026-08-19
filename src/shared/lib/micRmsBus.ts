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
