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

/** a translateX that follows `x(t) = origin + slope · t` on the UI thread */
export function useLinearTransform(time: { value: number }, origin: number, slope: number) {
  const originSV = useSharedValue(origin);
  const slopeSV = useSharedValue(slope);
  if (originSV.value !== origin) originSV.value = origin;
  if (slopeSV.value !== slope) slopeSV.value = slope;
  return useDerivedValue(() => [{ translateX: originSV.value + time.value * slopeSV.value }]);
}
