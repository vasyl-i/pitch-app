import { useRef } from 'react';
import { Skia, type SkPath } from '@shopify/react-native-skia';
import { NOTICEABLE_CENTS, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import type { PianoRollLayout } from './usePianoRollLayout';

interface PitchSample {
  t: number;
  midi: number;
  cents: number | null;
}

export type BandPaths = Record<'lime' | 'yellow' | 'orange' | 'red' | 'gray', SkPath>;

/** a gap longer than this in the samples breaks the line */
const MAX_JOIN_SEC = 0.25;

export const emptyPaths = (): BandPaths => ({
  lime: Skia.Path.Make(),
  yellow: Skia.Path.Make(),
  orange: Skia.Path.Make(),
  red: Skia.Path.Make(),
  gray: Skia.Path.Make(),
});

export function bandOf(paths: BandPaths, cents: number | null): SkPath {
  if (cents === null) return paths.gray;
  const a = Math.abs(cents);
  return a <= PERFECT_CENTS ? paths.lime : a <= SLIGHT_CENTS ? paths.yellow : a <= NOTICEABLE_CENTS ? paths.orange : paths.red;
}

/**
 * The sung trail as one path per accuracy band, built incrementally: the
 * store's trail only holds the last few seconds, so every new sample is kept
 * here for the whole phrase, and only segments after the last build are
 * appended. Everything restarts when the trail is cleared (a new stage) or
 * the layout changes.
 */
export function useTrailPaths(trail: PitchSample[], layout: PianoRollLayout): BandPaths {
  const full = useRef<PitchSample[]>([]);
  const lastSeenT = useRef(-1);
  const built = useRef(0);
  const paths = useRef<BandPaths>(emptyPaths());
  const builtFor = useRef('');

  const reset = () => {
    built.current = 0;
    paths.current = emptyPaths();
  };

  if (trail.length === 0 && full.current.length > 0) {
    full.current = [];
    lastSeenT.current = -1;
  }
  if (trail.length > 0 && trail[trail.length - 1].t > lastSeenT.current) {
    for (const s of trail) if (s.t > lastSeenT.current) full.current.push(s);
    lastSeenT.current = trail[trail.length - 1].t;
  }
  if (builtFor.current !== layout.key || (full.current.length === 0 && built.current > 0)) {
    builtFor.current = layout.key;
    reset();
  }

  const samples = full.current;
  if (layout.H > 0 && layout.W > 0 && samples.length > built.current) {
    for (let i = Math.max(1, built.current); i < samples.length; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      if (b.t - a.t > MAX_JOIN_SEC) continue;
      const band = bandOf(paths.current, b.cents);
      band.moveTo(layout.xOfTime(a.t), layout.yOfMidi(a.midi));
      band.lineTo(layout.xOfTime(b.t), layout.yOfMidi(b.midi));
    }
    built.current = samples.length;
  }
  return paths.current;
}
