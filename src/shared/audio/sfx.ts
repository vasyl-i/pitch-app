/**
 * Haptic feedback and UI sound effects.
 *
 * Haptic cues:
 *   - **hapticMicReady** — light→medium double tap when mic starts listening
 *   - **hapticWarning** — warning notification haptic for calibration failures
 *   - **hapticTick** — light tap for countdown steps
 *
 * Sound + haptic:
 *   - **playTick** — soft clock tick with light haptic (countdowns)
 */
import * as Haptics from 'expo-haptics';
import { audioContext } from './toneBus';
import { getSoundPrefs } from './soundStore';

const SFX_VOLUME = 0.25;

/** Light→medium double tap when mic starts listening. */
export function hapticMicReady() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 80);
}

/** Warning haptic for error states (too quiet, too noisy, permission denied). */
export function hapticWarning() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Single light tap for countdown / wait ticks. */
export function hapticTick() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Soft clock tick + light haptic. Used for countdowns. */
export function playTick() {
  hapticTick();

  const prefs = getSoundPrefs();
  const vol = SFX_VOLUME * 0.6 * prefs.volume;
  if (vol <= 0) return;

  const ctx = audioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}
