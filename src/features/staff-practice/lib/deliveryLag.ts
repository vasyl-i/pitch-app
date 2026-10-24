/**
 * How late a mic frame reached JS, beyond the pipeline's usual delay.
 *
 * Frames are timed on the playback clock when they arrive, but they arrive in
 * bursts whenever the JS thread was busy (a render, a GC, a haptic call): a
 * frame captured on the beat can be handled 50–100 ms later and be graded as a
 * late onset. Each frame carries its capture time (`when`, sample-accurate,
 * seconds since the recording started), so the extra delay is measurable:
 * arrival minus capture, less the smallest such gap seen — the pipeline's
 * fixed latency, which the grading's detection lag already allows for.
 */

/** never back-date a frame by more than this — past it, something else is wrong */
const MAX_LAG_MS = 250;

export interface DeliveryLag {
  /** ms this frame arrived later than the fastest delivery seen; 0 without a capture time */
  lagMs(when: number | undefined, arrivedAt: number): number;
  /** forget the baseline (a new recording restarts `when` from zero) */
  reset(): void;
}

export function createDeliveryLag(): DeliveryLag {
  /** smallest arrival − capture gap seen, ms */
  let base: number | null = null;
  let lastWhen = -Infinity;

  return {
    lagMs(when, arrivedAt) {
      if (when === undefined || !Number.isFinite(when)) return 0;
      const gap = arrivedAt - when * 1000;
      // a restarted recorder, or a gap no burst explains: start over from here
      if (base === null || when < lastWhen || gap - base > MAX_LAG_MS) base = gap;
      lastWhen = when;
      if (gap < base) base = gap;
      return gap - base;
    },
    reset() {
      base = null;
      lastWhen = -Infinity;
    },
  };
}
