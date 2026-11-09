import { useRef } from 'react';
import { useClock } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

/**
 * Phrase time on the UI thread, at 60 fps whatever the JS thread is doing:
 * the Skia clock, offset once to match `currentTime` (seconds) and advancing
 * `rate` phrase-seconds per real second. It re-syncs on a time jump
 * (> 0.5 s: a restart, a new stage) or a new rate, and holds `currentTime`
 * while not running. Shared values are written only when they change —
 * needless cross-thread writes disturb the motion.
 */
export function usePhraseClock({ currentTime, rate = 1, running, ready }: {
  currentTime: number;
  rate?: number;
  running: boolean;
  /** laid out: the first sync waits for a size */
  ready: boolean;
}) {
  const clock = useClock();
  const offsetSec = useSharedValue(0);
  const rateSV = useSharedValue(rate);
  const synced = useRef(false);
  const prevTime = useRef(currentTime);

  const jumped = Math.abs(currentTime - prevTime.current) > 0.5 || rateSV.value !== rate;
  if ((!synced.current && ready && running) || (synced.current && jumped)) {
    rateSV.value = rate;
    offsetSec.value = currentTime - (clock.value / 1000) * rate;
    synced.current = true;
  }
  prevTime.current = currentTime;

  const runningSV = useSharedValue(running ? 1 : 0);
  const pausedSV = useSharedValue(currentTime);
  if (runningSV.value !== (running ? 1 : 0)) runningSV.value = running ? 1 : 0;
  if (!running && pausedSV.value !== currentTime) pausedSV.value = currentTime;

  return useDerivedValue(() => (runningSV.value ? (clock.value / 1000) * rateSV.value + offsetSec.value : pausedSV.value));
}

/**
 * The scroll of a roll longer than its window, on the UI thread: the view
 * holds still until the playhead is `lead` of the way across, then keeps it
 * there, and stops at the end of the phrase. No scroll when it all fits.
 */
export function useScrollTransform(time: { value: number }, { scrolls, totalSec, shownSec, pxPerSec, lead = 0.3 }: {
  scrolls: boolean;
  totalSec: number;
  shownSec: number;
  pxPerSec: number;
  lead?: number;
}) {
  const params = useSharedValue({ scrolls, totalSec, shownSec, pxPerSec, lead });
  const p = params.value;
  if (p.scrolls !== scrolls || p.totalSec !== totalSec || p.shownSec !== shownSec || p.pxPerSec !== pxPerSec || p.lead !== lead) {
    params.value = { scrolls, totalSec, shownSec, pxPerSec, lead };
  }
  return useDerivedValue(() => {
    const q = params.value;
    if (!q.scrolls) return [{ translateX: 0 }];
    const start = Math.min(Math.max(time.value - q.shownSec * q.lead, 0), q.totalSec - q.shownSec);
    return [{ translateX: -start * q.pxPerSec }];
  });
}

/** a translateX that follows `x(t) = origin + slope · t` on the UI thread */
export function useLinearTransform(time: { value: number }, origin: number, slope: number) {
  const originSV = useSharedValue(origin);
  const slopeSV = useSharedValue(slope);
  if (originSV.value !== origin) originSV.value = origin;
  if (slopeSV.value !== slope) slopeSV.value = slope;
  return useDerivedValue(() => [{ translateX: originSV.value + time.value * slopeSV.value }]);
}
