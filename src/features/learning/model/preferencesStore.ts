/**
 * Learning preferences: the user's goals, time budget, experience and taste.
 * Collected during onboarding, editable any time from Profile → Goal & preferences.
 *
 * Deliberately a separate store from both the vocal profile (measured facts
 * about the voice) and the learning profile (accumulated skill history):
 * changing a preference must never touch historical learning data.
 */
import { mmkvStorage } from '@/shared/lib/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { translatedRecord } from '@/shared/i18n';
import type { LearningPreferences } from './types';

/** Stored values stay English (persisted + synced); display through `GENRE_LABELS`. */
export const GENRE_OPTIONS = ['Pop', 'Rock', 'Classical', 'Jazz', 'Musical theatre', 'Folk', 'R&B', 'Country'] as const;

export const GENRE_LABELS: Partial<Record<string, string>> = translatedRecord<(typeof GENRE_OPTIONS)[number]>({
  Pop: 'learning.genres.pop',
  Rock: 'learning.genres.rock',
  Classical: 'learning.genres.classical',
  Jazz: 'learning.genres.jazz',
  'Musical theatre': 'learning.genres.musicalTheatre',
  Folk: 'learning.genres.folk',
  'R&B': 'learning.genres.rnb',
  Country: 'learning.genres.country',
});

export const DEFAULT_PREFERENCES: Omit<LearningPreferences, 'updatedAt'> = {
  primaryGoal: 'sing-in-tune',
  secondaryGoal: null,
  dailyMinutes: 10,
  experience: 'beginner',
  musicReading: 'none',
  preferredGenres: [],
  coachStyle: 'encouraging',
  reminderHour: null,
  reminderMinute: 0,
  preferredDifficulty: 'adaptive',
};

interface PreferencesState {
  /** null until the user has answered the onboarding questions (or skipped into defaults) */
  preferences: LearningPreferences | null;
  setPreferences: (update: Partial<Omit<LearningPreferences, 'updatedAt'>>) => void;
  /** apply the server's copy as-is, keeping its timestamp (so it is not mistaken for a newer local edit) */
  importPreferences: (remote: LearningPreferences) => void;
  clearPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: null,

      setPreferences: (update) => {
        const current = get().preferences ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
        set({ preferences: { ...current, ...update, updatedAt: Date.now() } });
      },

      importPreferences: (remote) => set({ preferences: remote }),

      clearPreferences: () => set({ preferences: null }),
    }),
    {
      name: 'pitch-coach-learning-prefs',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
    }
  )
);
