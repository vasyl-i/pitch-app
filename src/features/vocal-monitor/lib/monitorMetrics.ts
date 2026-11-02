/**
 * The Vocal Monitor's two numbers. There is no target note in a sandbox, so
 * "accuracy" is how close the voice sits to the nearest semitone and
 * "stability" is how little it wobbles while holding one. Display only — pure
 * functions over the raw detector pitch, never fed back into grading.
 */
/** within this of a semitone still earns full marks — forgiving of ordinary singing */
const FULL_MARKS_CENTS = 20;
/** the farthest a pitch can be from a semitone */
const MAX_CENTS = 50;
/** stdev (cents) at or under which a held note reads as perfectly steady */
const STEADY_CENTS = 8;
/** stdev (cents) at which stability bottoms out */
const UNSTEADY_CENTS = 40;

/** signed distance to the nearest semitone, -50..50 */
export function centsFromNearestNote(midi: number): number {
  return (midi - Math.round(midi)) * 100;
}

/** 0–100: full marks within 20 cents, falling to 0 at a quarter-tone off */
export function accuracyScore(cents: number): number {
  const off = Math.abs(cents);
  if (off <= FULL_MARKS_CENTS) return 100;
  return Math.round(100 * Math.max(0, 1 - (off - FULL_MARKS_CENTS) / (MAX_CENTS - FULL_MARKS_CENTS)));
}

/** 0–100 from the pitch's standard deviation in cents over a short window */
export function stabilityScore(stdevCents: number): number {
  if (stdevCents <= STEADY_CENTS) return 100;
  return Math.round(100 * Math.max(0, 1 - (stdevCents - STEADY_CENTS) / (UNSTEADY_CENTS - STEADY_CENTS)));
}

export type StabilityLevel = 'steady' | 'wobbly' | 'unsteady';

export function stabilityLevel(score: number): StabilityLevel {
  return score >= 75 ? 'steady' : score >= 45 ? 'wobbly' : 'unsteady';
}

export interface RollingMean {
  push(value: number, now: number): void;
  /** the mean of what's in the window, null when it holds nothing */
  mean(now: number): number | null;
  reset(): void;
}

/** the mean of values pushed in the last `windowMs` */
export function createRollingMean(windowMs: number): RollingMean {
  let items: { value: number; at: number }[] = [];
  const prune = (now: number) => {
    let drop = 0;
    while (drop < items.length && now - items[drop].at > windowMs) drop++;
    if (drop) items = items.slice(drop);
  };
  return {
    push(value, now) {
      items.push({ value, at: now });
      prune(now);
    },
    mean(now) {
      prune(now);
      return items.length ? items.reduce((a, i) => a + i.value, 0) / items.length : null;
    },
    reset() {
      items = [];
    },
  };
}
