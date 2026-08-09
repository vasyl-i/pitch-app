/**
 * Learning preferences: the user's goals, time budget, experience and taste.
 * Collected during onboarding, editable any time from Profile → Goal & preferences.
 *
 * Deliberately a separate store from both the vocal profile (measured facts
 * about the voice) and the learning profile (accumulated skill history):
 * changing a preference must never touch historical learning data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LearningPreferences } from './types';

export const GENRE_OPTIONS = ['Pop', 'Rock', 'Classical', 'Jazz', 'Musical theatre', 'Folk', 'R&B', 'Country'] as const;

export const DEFAULT_PREFERENCES: Omit<LearningPreferences, 'updatedAt'> = {
  primaryGoal: 'sing-in-tune',
  secondaryGoal: null,
  dailyMinutes: 10,
  experience: 'beginner',
  musicReading: 'none',
  preferredGenres: [],
  coachStyle: 'encouraging',
  reminderHour: null,
  preferredDifficulty: 'adaptive',
};

interface PreferencesState {
  /** null until the user has answered the onboarding questions (or skipped into defaults) */
  preferences: LearningPreferences | null;
  setPreferences: (update: Partial<Omit<LearningPreferences, 'updatedAt'>>) => void;
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

      clearPreferences: () => set({ preferences: null }),
    }),
    {
      name: 'pitch-coach-learning-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
