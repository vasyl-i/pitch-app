import { requireOptionalNativeModule } from 'expo-modules-core';

interface HapticTickNative {
  isSupported(): boolean;
  prepare(): void;
  release(): void;
  tick(): void;
}

/** absent on web and on a binary built before this module existed */
const native = requireOptionalNativeModule<HapticTickNative>('HapticTick');

let supported: boolean | null = null;

/**
 * Can this phone play a short, crisp tap? iPhone 8 and later; Android with a
 * predefined click effect. False on the simulator, iPads and rumble motors.
 */
export function supportsHapticTick(): boolean {
  if (supported === null) {
    try {
      supported = !!native?.isSupported();
    } catch {
      supported = false;
    }
  }
  return supported;
}

/** start the haptic engine ahead of the first tap */
export function prepareHapticTick(): void {
  if (supportsHapticTick()) native!.prepare();
}

/** let the haptic engine shut down */
export function releaseHapticTick(): void {
  if (supportsHapticTick()) native!.release();
}

/** one metronome tap; returns immediately, played off the JS and main threads */
export function hapticTick(): void {
  if (supportsHapticTick()) native!.tick();
}
