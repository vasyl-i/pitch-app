/**
 * Is the app's sound going somewhere the microphone cannot hear?
 *
 * Advisory only. The accompaniment stage plays regardless of the answer —
 * this is what lets the UI recommend headphones, and it is the natural seam
 * for handling speaker leakage properly later. The reference interlock
 * (`features/pitch-detection/lib/referenceGate`) exists because the speaker
 * and the mic share a room: a triangle oscillator held dead steady on the
 * target note reads to YIN as a flawless performance, and no downstream
 * heuristic can tell that apart from a singer. When output goes to
 * headphones, that acoustic path does not exist — the interlock is protecting
 * against a leak that cannot happen, and can be safely lifted for the
 * sing-along stage.
 *
 * Kept free of any audio-library import so the rule can be tested on its own;
 * `routeWatcher` is the module that actually asks the device.
 *
 * ## The Bluetooth caveat
 *
 * A port type says how audio leaves the device, not what it arrives at. AirPods
 * and a Bluetooth *speaker on the table* are both `BluetoothA2DP` — the OS
 * exposes nothing that separates them, so a Bluetooth speaker reads as private
 * here and gets no headphone hint. Harmless while this is advisory; it needs
 * revisiting if the answer is ever wired back to gating.
 */

/**
 * Output port types with no acoustic path back to the built-in mic.
 *
 * Values are the platform's own device-category strings, normalized: iOS
 * reports the raw `AVAudioSessionPort` constant, Android a human-readable name
 * derived from `AudioDeviceInfo.type`.
 */
const PRIVATE_OUTPUTS: ReadonlySet<string> = new Set([
  // iOS — AVAudioSessionPort constants
  'headphones',
  'bluetootha2dp',
  'bluetoothhfp',
  'bluetoothle',
  'usbaudio',
  // Android — MediaSessionManager.parseDeviceCategory. 'Bluetooth A2DP'
  // normalizes onto the iOS entry above.
  'wiredheadset',
  'wiredheadphones',
  'bluetoothsco',
]);

const normalize = (category: string) => category.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * True only when *every* current output is private.
 *
 * Deliberately `every`, not `some`: iOS can route to headphones and the
 * built-in speaker at once, and one speaker in the list is enough to put the
 * accompaniment back under the microphone.
 *
 * Fails closed — an empty list, an unrecognised port, or anything the platform
 * describes as `Other (…)` counts as not private. The cost of a false negative
 * is a silent (but fully animated) accompaniment stage; the cost of a false
 * positive is a score that measures the app singing to itself.
 */
export function isPrivateOutput(categories: readonly string[]): boolean {
  if (categories.length === 0) return false;
  return categories.every((c) => PRIVATE_OUTPUTS.has(normalize(c)));
}
