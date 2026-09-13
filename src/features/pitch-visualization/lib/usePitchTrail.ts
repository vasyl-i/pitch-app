import { useCallback, useRef, useState } from 'react';

interface TrailSample {
  t: number;
  midi: number;
  cents: number | null;
}

const TRAIL_SECONDS = 6;

/**
 * Accumulates a ring buffer of pitch samples from live updates, suitable for
 * feeding to ScrollingPitchCanvas. Call `push()` whenever a new pitch frame
 * arrives. `now` advances with each push so the canvas knows the current time.
 *
 * Scrolling animation is handled by ScrollingPitchCanvas itself via Skia
 * clock + translate-group — this hook no longer needs a timer to advance `now`.
 */
export function usePitchTrail(trailSeconds = TRAIL_SECONDS) {
  const bufRef = useRef<TrailSample[]>([]);
  const startRef = useRef(Date.now());
  const [trail, setTrail] = useState<TrailSample[]>([]);
  const [now, setNow] = useState(0);

  const push = useCallback(
    (midi: number | null, cents: number | null = null) => {
      const t = (Date.now() - startRef.current) / 1000;
      setNow(t);
      if (midi !== null) {
        bufRef.current.push({ t, midi, cents });
        const cutoff = t - trailSeconds;
        while (bufRef.current.length && bufRef.current[0].t < cutoff) {
          bufRef.current.shift();
        }
        setTrail([...bufRef.current]);
      }
    },
    [trailSeconds],
  );

  const reset = useCallback(() => {
    bufRef.current = [];
    startRef.current = Date.now();
    setTrail([]);
    setNow(0);
  }, []);

  return { trail, now, push, reset };
}
