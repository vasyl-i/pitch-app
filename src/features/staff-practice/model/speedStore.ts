/**
 * The singer's chosen tempo for each piano-roll exercise, and the direction
 * each scale sweeps through the keys when practised on its own.
 *
 * A speed is a playback-rate multiple of the exercise's authored tempo; the
 * preview and the sung pass both run at it (the run's `rate`), so the phrase
 * is heard exactly as fast as it is to be sung. Picked per exercise in the
 * practice library and remembered on this device, so it applies however the
 * exercise is opened — from the library or as a step of the daily plan.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';

/** the authored tempo and four faster ones; the last two are Premium */
export const SPEED_LEVELS = [1, 1.25, 1.5, 1.75, 2] as const;
export type SpeedLevel = (typeof SPEED_LEVELS)[number];

/** the fastest speed the free tier gets */
export const MAX_FREE_SPEED: SpeedLevel = 1.5;

export function isPremiumSpeed(rate: number): boolean {
  return rate > MAX_FREE_SPEED;
}

/** the tempo a speed plays an exercise at, for labelling, e.g. 100 → 125 */
export function speedBpm(bpm: number, rate: number): number {
  return Math.round(bpm * rate);
}

/** which way a scale practised on its own sweeps through the keys first */
export type ScaleDirection = 'up' | 'down';

interface SpeedState {
  /** exercise id → rate; absent means the authored tempo */
  speeds: Record<string, SpeedLevel>;
  /** scale id → sweep direction; absent means up (lowest key first) */
  directions: Record<string, ScaleDirection>;
  /** a light haptic tap on every beat of a piano-roll run, for all exercises */
  metronome: boolean;
  setSpeed: (exerciseId: string, rate: SpeedLevel) => void;
  setDirection: (exerciseId: string, direction: ScaleDirection) => void;
  setMetronome: (on: boolean) => void;
}

export const useSpeedStore = create<SpeedState>()(
  persist(
    (set) => ({
      speeds: {},
      directions: {},
      metronome: false,
      setSpeed: (exerciseId, rate) => set((s) => ({ speeds: { ...s.speeds, [exerciseId]: rate } })),
      setDirection: (exerciseId, direction) =>
        set((s) => ({ directions: { ...s.directions, [exerciseId]: direction } })),
      setMetronome: (on) => set({ metronome: on }),
    }),
    {
      name: 'pitch-coach-melody-speeds',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
    },
  ),
);

export function directionFor(exerciseId: string): ScaleDirection {
  return useSpeedStore.getState().directions[exerciseId] === 'down' ? 'down' : 'up';
}

/**
 * The rate to run an exercise at: the singer's pick, else the authored
 * tempo. A Premium speed picked while subscribed drops to the fastest free
 * one once Premium lapses — the choice is kept for if they come back.
 */
export function speedFor(exerciseId: string, premium: boolean): SpeedLevel {
  const rate = useSpeedStore.getState().speeds[exerciseId];
  if (rate === undefined || !(SPEED_LEVELS as readonly number[]).includes(rate)) return 1;
  return !premium && isPremiumSpeed(rate) ? MAX_FREE_SPEED : rate;
}
