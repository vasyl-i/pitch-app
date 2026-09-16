/**
 * Persisted sound preferences: master volume and instrument sound.
 *
 * Read by the tone bus at schedule time so every voice inherits the user's
 * choices without each caller passing them explicitly.
 */
import { mmkvStorage } from '@/shared/lib/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SoundType = 'piano' | 'harp' | 'organ' | 'musicbox' | 'electrobox' | 'saw' | 'simple';

export const SOUND_TYPE_LABELS: Record<SoundType, string> = {
  piano: 'Piano',
  harp: 'Harp',
  organ: 'Organ',
  musicbox: 'Music box',
  electrobox: 'Electro box',
  saw: 'Saw',
  simple: 'Simple',
};

interface SoundState {
  /** 0–1 master volume multiplier applied to every scheduled tone */
  volume: number;
  /** instrument sound */
  soundType: SoundType;
  setVolume: (v: number) => void;
  setSoundType: (t: SoundType) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      volume: 0.8,
      soundType: 'piano',
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setSoundType: (soundType) => set({ soundType }),
    }),
    {
      name: 'pitch-coach-sound-prefs',
      storage: createJSONStorage(() => mmkvStorage),
      version: 2,
      migrate: (state: unknown, version: number) => {
        if (version < 2) {
          const s = state as Record<string, unknown>;
          // Old oscillator types (triangle, sine, square, sawtooth) → piano
          const oldType = s.soundType as string;
          const validTypes: string[] = ['piano', 'harp', 'organ', 'musicbox', 'electrobox', 'saw', 'simple'];
          if (!validTypes.includes(oldType)) {
            s.soundType = 'piano';
          }
        }
        return state as SoundState;
      },
    }
  )
);

/** Non-reactive snapshot for the audio thread (avoids hook rules in non-React code). */
export function getSoundPrefs() {
  return useSoundStore.getState();
}
