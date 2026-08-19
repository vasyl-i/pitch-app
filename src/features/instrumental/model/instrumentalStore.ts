/**
 * The user's imported instrumental tracks. Persisted so a track uploaded once
 * stays in the library across launches. Free tier keeps up to
 * `FREE_INSTRUMENTAL_LIMIT` tracks; the `unlimited-instrumental-uploads`
 * entitlement lifts the cap (checked at the upload screen, not here — stores
 * hold state, gates live in the UI via `useEntitlement`).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import type { DetectedKey, InstrumentalTrack } from './types';

export const FREE_INSTRUMENTAL_LIMIT = 3;

interface InstrumentalState {
  tracks: InstrumentalTrack[];
  addTrack: (track: Omit<InstrumentalTrack, 'id' | 'createdAt' | 'key'>) => InstrumentalTrack;
  setTrackKey: (id: string, key: DetectedKey) => void;
  removeTrack: (id: string) => void;
}

export const useInstrumentalStore = create<InstrumentalState>()(
  persist(
    (set, get) => ({
      tracks: [],

      addTrack: (track) => {
        const full: InstrumentalTrack = {
          ...track,
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          key: null,
        };
        set({ tracks: [full, ...get().tracks] });
        return full;
      },

      setTrackKey: (id, key) =>
        set({ tracks: get().tracks.map((t) => (t.id === id ? { ...t, key } : t)) }),

      removeTrack: (id) => set({ tracks: get().tracks.filter((t) => t.id !== id) }),
    }),
    {
      name: 'pitch-coach-instrumentals',
      storage: createJSONStorage(() => mmkvStorage),
      // v2: real key detection replaced the stub — wipe stub keys so every
      // track re-analyzes on next open
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { tracks?: InstrumentalTrack[] };
        return { ...state, tracks: (state.tracks ?? []).map((t) => ({ ...t, key: null })) };
      },
    }
  )
);
