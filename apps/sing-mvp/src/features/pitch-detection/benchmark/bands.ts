/**
 * Operating ranges.
 *
 * The engineering spec originally stated pitch accuracy, octave error and
 * latency as single global numbers. Measurement does not support that: the same
 * detector measures ~0.6¢ at C4 and ~12.7¢ at B5, and above ~1kHz it does not
 * degrade at all but fails outright. A single figure is therefore either a lie
 * about the top of the range or a uselessly loose bound on the middle of it.
 *
 * So every accuracy claim in this harness is attached to one of these bands.
 * The band edges are not tidy round numbers chosen for looks — they are where
 * the measured behaviour actually changes, which is why `MIN_RELIABLE_F0` and
 * `MAX_RELIABLE_F0` from the detector appear as boundaries.
 */

export interface Band {
  id: string;
  label: string;
  minHz: number;
  maxHz: number;
  /** what makes this band different, in one line — printed with the results */
  character: string;
}

export const BANDS: Band[] = [
  {
    id: 'sub-low',
    label: 'below declared range',
    minHz: 40,
    maxHz: 65,
    character: 'still detected, but the window holds barely two periods — accuracy degrades',
  },
  {
    id: 'low',
    label: 'low voice (C2–B2)',
    minHz: 65,
    maxHz: 130,
    character: 'bass/baritone bottom; the declared floor',
  },
  {
    id: 'mid',
    label: 'core range (C3–E4)',
    minHz: 130,
    maxHz: 330,
    character: 'where most singing happens and where the detector is near-exact',
  },
  {
    id: 'upper-mid',
    label: 'upper range (F4–E5)',
    minHz: 330,
    maxHz: 660,
    character: 'samples per period falling; interpolation has less to work with',
  },
  {
    id: 'high',
    label: 'high range (F5–B5)',
    minHz: 660,
    maxHz: 1000,
    character: 'resolution-limited but musically usable; the declared ceiling',
  },
  {
    id: 'above-range',
    label: 'above declared range',
    minHz: 1000,
    maxHz: 1600,
    character: 'pinned failure: locks onto the sub-harmonic and reports an octave low',
  },
];

export function bandFor(hz: number): Band | undefined {
  return BANDS.find((b) => hz >= b.minHz && hz < b.maxHz);
}

export function bandIdFor(hz: number): string | undefined {
  return bandFor(hz)?.id;
}

export function bandById(id: string): Band | undefined {
  return BANDS.find((b) => b.id === id);
}
