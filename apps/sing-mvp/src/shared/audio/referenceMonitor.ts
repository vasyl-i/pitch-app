/**
 * Bookkeeping for "is the app making a sound right now?".
 *
 * Every sound this app produces is scheduled through the tone bus, which makes
 * this the one place that knows *authoritatively* when the speaker is emitting
 * reference audio. The microphone pipeline consults it to refuse frames that
 * could contain the app's own output (see
 * `features/pitch-detection/lib/referenceGate`).
 *
 * That check has to come from the source of truth rather than from the signal:
 * the reference is a triangle oscillator, about the most perfectly periodic
 * thing a pitch detector can be handed, so bleed from it reads as a flawless,
 * rock-steady performance on exactly the right note. No level-, clarity- or
 * continuity-based heuristic downstream can separate that from a singer.
 * Knowing what we scheduled, and when, can.
 *
 * Horizons are wall-clock ms (`Date.now()`), not audio-clock seconds: the
 * recorder and the AudioContext run on independent clocks, and the frame
 * handlers that consume this already timestamp with `Date.now()`. Kept free of
 * any audio-library import so the rule can be tested on its own.
 */

interface SoundingEntry {
  untilWall: number;
}

const sounding = new Set<SoundingEntry>();

/** One sound source's claim on the speaker. */
export interface SoundingHandle {
  /** the source is scheduled to be audible through this wall-clock ms */
  extendTo(untilWall: number): void;
  /** the source has fallen silent now, whatever it had scheduled */
  clear(): void;
}

export function trackSounding(): SoundingHandle {
  const entry: SoundingEntry = { untilWall: 0 };
  return {
    extendTo(untilWall) {
      if (untilWall > entry.untilWall) entry.untilWall = untilWall;
      sounding.add(entry);
    },
    clear() {
      entry.untilWall = 0;
      sounding.delete(entry);
    },
  };
}

/**
 * How long a finished claim is kept around. It must comfortably exceed any
 * caller's guard: a sound that ended a moment ago is precisely the case the
 * guard exists for, so discarding its horizon the instant it passes would
 * silently defeat it.
 */
const PRUNE_LAG_MS = 10_000;

/**
 * The latest wall-clock ms through which app-generated audio is, or was,
 * scheduled to sound. May be in the past — callers compare it against their
 * own guard rather than treating it as a boolean.
 */
export function referenceAudibleThrough(now = Date.now()): number {
  let latest = 0;
  for (const entry of sounding) {
    if (entry.untilWall <= now - PRUNE_LAG_MS) sounding.delete(entry);
    else if (entry.untilWall > latest) latest = entry.untilWall;
  }
  return latest;
}

/**
 * Is the app sounding reference audio now, or within `guardMs` of having done
 * so? Callers pass a guard because a microphone frame is not an instant — see
 * `REFERENCE_GUARD_MS`.
 */
export function isReferenceAudible(guardMs = 0, now = Date.now()): boolean {
  return referenceAudibleThrough(now) + guardMs > now;
}

/** Test seam: forget every claim. Not used by app code. */
export function resetReferenceMonitor(): void {
  sounding.clear();
}
