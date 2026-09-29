import { useCallback, useRef, useState } from 'react';

interface TrailSample {
  t: number;
  midi: number;
  cents: number | null;
}

const TRAIL_SECONDS = 6;
/** Minimum ms between React state flushes — keeps path rebuilds ≤6/sec.
 *  Higher values = fewer React re-renders = smoother UI-thread scroll. */
const FLUSH_INTERVAL_MS = 160;

/**
 * Accumulates a ring buffer of pitch samples from live updates, suitable for
 * feeding to ScrollingPitchCanvas. Call `push()` whenever a new pitch frame
 * arrives. `now` advances with each flush so the canvas knows the current time.
 *
 * Scrolling animation is handled by ScrollingPitchCanvas itself via Skia
 * clock + translate-group — this hook only needs to flush state often enough
 * for the trail to visually extend.
 *
 * Both `trail` and `now` are flushed together at FLUSH_INTERVAL_MS to avoid
 * triggering separate React re-renders.
 */
export function usePitchTrail(trailSeconds = TRAIL_SECONDS) {
  const bufRef = useRef<TrailSample[]>([]);
  const startRef = useRef(Date.now());
  const lastFlushRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestT = useRef(0);
  const [trail, setTrail] = useState<TrailSample[]>([]);
  const [now, setNow] = useState(0);

  const doFlush = useCallback(() => {
    flushTimerRef.current = null;
    lastFlushRef.current = Date.now();
    setTrail([...bufRef.current]);
    setNow(latestT.current);
  }, []);

  const push = useCallback(
    (midi: number | null, cents: number | null = null) => {
      const t = (Date.now() - startRef.current) / 1000;
      latestT.current = t;

      if (midi !== null) {
        bufRef.current.push({ t, midi, cents });
        const cutoff = t - trailSeconds;
        while (bufRef.current.length && bufRef.current[0].t < cutoff) {
          bufRef.current.shift();
        }
      }

      // Throttle state flushes to reduce React re-renders + path rebuilds
      const elapsed = Date.now() - lastFlushRef.current;
      if (elapsed >= FLUSH_INTERVAL_MS) {
        doFlush();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(doFlush, FLUSH_INTERVAL_MS - elapsed);
      }
    },
    [trailSeconds, doFlush],
  );

  const reset = useCallback(() => {
    bufRef.current = [];
    startRef.current = Date.now();
    lastFlushRef.current = 0;
    latestT.current = 0;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    setTrail([]);
    setNow(0);
  }, []);

  return { trail, now, push, reset };
}
