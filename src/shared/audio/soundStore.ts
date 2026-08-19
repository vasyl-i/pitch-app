/**
 * Persisted sound preferences: master volume and oscillator waveform.
 *
 * Read by the tone bus at schedule time so every voice inherits the user's
 * choices without each caller passing them explicitly.
 */
import { mmkvStorage } from '@/shared/lib/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SoundType = 'piano' | 'triangle' | 'sine' | 'square' | 'sawtooth';

export const SOUND_TYPE_LABELS: Record<SoundType, string> = {
  piano: 'Piano',
  triangle: 'Triangle',
  sine: 'Sine',
  square: 'Square',
  sawtooth: 'Sawtooth',
};

interface SoundState {
  /** 0–1 master volume multiplier applied to every scheduled tone */
  volume: number;
  /** oscillator waveform */
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
      version: 1,
    }
  )
);

/** Non-reactive snapshot for the audio thread (avoids hook rules in non-React code). */
export function getSoundPrefs() {
  return useSoundStore.getState();
}
