/**
 * A metronome felt rather than heard: one light haptic tap per beat while a
 * piano-roll run's timeline is moving.
 *
 * Haptic on purpose. The solo stage is silent so nothing the app plays can
 * reach the microphone; an audible click would either leak into the pitch
 * track or, on the speaker, make the mic broker drop frames on every beat —
 * gaps the rhythm grading reads as re-attacks. A ~10 ms tap is far too short
 * and aperiodic for the pitch detector to take for a note.
 *
 * The tap comes from the native `haptic-tick` module, played off the JS and
 * main threads. Phones that can't play a short, crisp tap get no metronome
 * at all (see `supportsHapticTick`): a buzz that smears across the beat is
 * worse than none.
 */
import { useEffect } from 'react';
import {
  hapticTick,
  prepareHapticTick,
  releaseHapticTick,
  supportsHapticTick,
} from '../../../../modules/haptic-tick/src';
import { startBeatClock } from '../lib/beatClock';
import { useStaffStore, type StaffStatus } from './staffStore';

/** stages whose timeline is moving: preview, sing-along, solo */
const TICKING: ReadonlySet<string> = new Set<StaffStatus>(['listen', 'accompanied', 'running']);

/**
 * @param bpm  the exercise's authored tempo — its notes are timed in beats of it
 * @param rate the playback speed; phrase time runs this many times real time
 */
export function useHapticMetronome(enabled: boolean, bpm: number, rate: number): void {
  useEffect(() => {
    if (!enabled || !supportsHapticTick()) return;
    prepareHapticTick();
    const stop = startBeatClock({ bpm, rate, store: useStaffStore, ticking: (s) => TICKING.has(s), onBeat: hapticTick });
    return () => {
      stop();
      releaseHapticTick();
    };
  }, [enabled, bpm, rate]);
}

/** whether this phone gets the metronome at all */
export function metronomeSupported(): boolean {
  return supportsHapticTick();
}
