/**
 * Haptic feedback and UI sound effects.
 *
 * Haptic cues:
 *   - **hapticMicReady** — light→medium double tap when mic starts listening
 *   - **hapticWarning** — warning notification haptic for calibration failures
 *   - **hapticTick** — light tap for countdown steps
 *
 * Sound + haptic:
 *   - **playTick** — soft clock tick with light haptic (one-off)
 *   - **startCountIn** — a whole count-in on the audio clock, for callers
 *     that need the visuals and haptics to land on the beat
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { audioContext } from './toneBus';
import { trackSounding } from './referenceMonitor';
import { getSoundPrefs } from './soundStore';

const SFX_VOLUME = 0.25;
const TICK_VOLUME = SFX_VOLUME * 0.6;
const TICK_LENGTH = 0.06;
/** audio-clock headroom so the first tick is never scheduled in the past */
const TICK_LEAD = 0.05;
/**
 * Rough time from the audio clock to sound leaving the speaker. The library
 * does not expose the device's real output latency; Android's path is
 * typically several times longer than iOS's.
 */
const OUTPUT_LATENCY = Platform.OS === 'android' ? 0.06 : 0.015;

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

/** one tick voice at an absolute audio-clock time; returns a stopper */
function scheduleTickSound(at: number, vol: number): () => void {
  const ctx = audioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(vol, at);
  gain.gain.linearRampToValueAtTime(0, at + TICK_LENGTH);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + TICK_LENGTH);
  return () => {
    try {
      gain.disconnect();
      osc.stop(ctx.currentTime);
    } catch {
      // voice had already ended
    }
  };
}

/** Soft clock tick + light haptic. */
export function playTick() {
  hapticTick();
  const vol = TICK_VOLUME * getSoundPrefs().volume;
  if (vol <= 0) return;
  scheduleTickSound(audioContext().currentTime, vol);
}

export interface CountInOptions {
  /** number of ticks */
  count: number;
  /** seconds between ticks */
  intervalSec: number;
  /** tick `index` (0-based) is being heard right now */
  onTick(index: number): void;
  /** one interval after the last tick */
  onDone(): void;
}

export interface CountIn {
  /** stop the ticks and drop every pending callback */
  cancel(): void;
}

/** the audio clock must keep pace with the wall clock this long before tick one */
const SETTLE_WINDOW_MS = 150;
/** how far the two clocks may disagree and still count as "keeping pace" */
const SETTLE_TOLERANCE_MS = 40;
/** give up waiting for a steady clock and start anyway */
const SETTLE_TIMEOUT_MS = 1500;
/** a JS callback reaches the screen about a frame later */
const DISPLAY_LEAD = 0.016;
/** if the audio clock stalls this long past a tick, fire it on the wall clock */
const STALL_GRACE_MS = 300;

/**
 * A ticking count-in whose visuals follow the *audio* clock.
 *
 * The output context and the recorder share one native audio engine, and the
 * context's clock only advances while that engine renders. Acquiring the mic
 * stops and restarts it (session category change, input node attach), so the
 * clock stalls for a while — a count-in timed on `setTimeout`, or converted to
 * wall time once up front, drifts away from its own sound. Here:
 *
 * 1. wait until the audio clock has been advancing in step with real time;
 * 2. schedule every tick sound on the audio clock in one go;
 * 3. poll the audio clock every frame and fire `onTick` as each tick is heard.
 *
 * If the engine stalls mid-count the numbers wait with the sound. A wall-clock
 * fallback keeps the count from hanging if the clock stops for good.
 */
export function startCountIn({ count, intervalSec, onTick, onDone }: CountInOptions): CountIn {
  const ctx = audioContext();
  const vol = TICK_VOLUME * getSoundPrefs().volume;
  // the ticks are app audio too: keep them out of the mic's room estimate
  const sounding = vol > 0 ? trackSounding() : null;
  const stoppers: (() => void)[] = [];

  let cancelled = false;
  let raf = 0;
  const settleStartedAt = Date.now();
  let anchorWall = settleStartedAt;
  let anchorAudio = ctx.currentTime;

  /** audio-clock time each tick is heard, plus one entry for "done" */
  let dueAudio: number[] | null = null;
  let dueWall: number[] = [];
  let next = 0;

  const begin = (nowAudio: number, nowWall: number) => {
    const t0 = nowAudio + TICK_LEAD;
    dueAudio = [];
    dueWall = [];
    for (let k = 0; k <= count; k++) {
      const at = t0 + k * intervalSec;
      if (k < count && vol > 0) stoppers.push(scheduleTickSound(at, vol));
      const heard = at + OUTPUT_LATENCY - DISPLAY_LEAD;
      dueAudio.push(heard);
      dueWall.push(nowWall + (heard - nowAudio) * 1000 + STALL_GRACE_MS);
    }
    sounding?.extendTo(nowWall + (t0 + (count - 1) * intervalSec + TICK_LENGTH + OUTPUT_LATENCY - nowAudio) * 1000);
  };

  const frame = () => {
    if (cancelled) return;
    const nowWall = Date.now();
    const nowAudio = ctx.currentTime;

    if (!dueAudio) {
      const drift = Math.abs((nowAudio - anchorAudio) * 1000 - (nowWall - anchorWall));
      if (drift > SETTLE_TOLERANCE_MS) {
        anchorWall = nowWall;
        anchorAudio = nowAudio;
      } else if (nowWall - anchorWall >= SETTLE_WINDOW_MS || nowWall - settleStartedAt >= SETTLE_TIMEOUT_MS) {
        begin(nowAudio, nowWall);
      }
    }

    if (dueAudio) {
      while (next <= count && (nowAudio >= dueAudio[next] || nowWall >= dueWall[next])) {
        const index = next++;
        if (index < count) {
          onTick(index);
        } else {
          sounding?.clear();
          onDone();
          return;
        }
        if (cancelled) return;
      }
    }
    raf = requestAnimationFrame(frame);
  };

  if (count <= 0) {
    onDone();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      stoppers.forEach((stop) => stop());
      sounding?.clear();
    },
  };
}
