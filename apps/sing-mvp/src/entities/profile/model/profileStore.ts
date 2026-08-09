/**
 * The singer's vocal profile: measured range, the comfortable and
 * training-time sub-ranges derived from it, and the preferences that follow.
 * Persisted on-device. Everything that needs to fit content to the voice
 * (exercise transposition, ear-training prompt generation) reads
 * `trainingRange` — the one range that already accounts for a temporary
 * reduction — rather than the raw measurement.
 *
 * This is an entity, not a feature: several unrelated features consume it
 * (staff practice, ear training, onboarding, settings), and having any one of
 * them reach into another's internals would tangle practice modes together.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PitchRange } from '@/shared/lib/music';
import { deriveComfortRange } from '../lib/comfort';

/** A user-initiated, non-persistent-feeling narrowing for an off day. */
export interface TemporaryAdjustment {
  /** semitones inset from each end of the comfort range */
  insetSemitones: number;
  reason: 'tired' | 'sick' | 'other';
  setAt: number;
}

export interface VocalProfile {
  /** the full extremes ever reliably detected — grows only through (re-)detection or a confirmed smart-range suggestion */
  maximumRange: PitchRange;
  /** comfortable sub-range for day-to-day content; defaults from maximumRange but can be hand-edited in settings */
  comfortRange: PitchRange;
  /** what exercises and prompts actually fit to right now — comfortRange minus any active temporary reduction */
  trainingRange: PitchRange;
  detectedAt: number;
  /** 0..1 confidence in the measurement, from detection clarity + coverage */
  confidence: number;
  temporaryAdjustment: TemporaryAdjustment | null;
}

function computeTrainingRange(comfort: PitchRange, adjustment: TemporaryAdjustment | null): PitchRange {
  if (!adjustment) return comfort;
  const low = comfort.lowMidi + adjustment.insetSemitones;
  // keep at least a fourth of range so a reduced day still has something to sing
  const high = Math.max(low + 5, comfort.highMidi - adjustment.insetSemitones);
  return { lowMidi: low, highMidi: high };
}

interface ProfileState {
  profile: VocalProfile | null;
  hasOnboarded: boolean;
  /** user preference: transpose exercises into range (default on) */
  autoTranspose: boolean;

  /** record a fresh detection pass — resets comfort/training back to the derived default and clears any temporary reduction */
  setDetectedRange: (maximumRange: PitchRange, confidence: number, detectedAt?: number) => void;
  /** hand-edit the comfort range (settings piano picker); widens maximumRange if the edit reaches past it */
  setComfortRange: (range: PitchRange) => void;
  /** back to the range `deriveComfortRange` would produce from the last detection */
  resetToDetected: () => void;
  setTemporaryAdjustment: (adjustment: TemporaryAdjustment | null) => void;
  clearProfile: () => void;
  setAutoTranspose: (v: boolean) => void;
  completeOnboarding: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      hasOnboarded: false,
      autoTranspose: true,

      setDetectedRange: (maximumRange, confidence, detectedAt = Date.now()) => {
        const comfortRange = deriveComfortRange(maximumRange);
        set({
          profile: {
            maximumRange,
            comfortRange,
            trainingRange: comfortRange,
            detectedAt,
            confidence,
            temporaryAdjustment: null,
          },
          hasOnboarded: true,
        });
      },

      setComfortRange: (range) => {
        const current = get().profile;
        if (!current) return;
        const maximumRange: PitchRange = {
          lowMidi: Math.min(current.maximumRange.lowMidi, range.lowMidi),
          highMidi: Math.max(current.maximumRange.highMidi, range.highMidi),
        };
        set({
          profile: {
            ...current,
            maximumRange,
            comfortRange: range,
            trainingRange: computeTrainingRange(range, current.temporaryAdjustment),
          },
        });
      },

      resetToDetected: () => {
        const current = get().profile;
        if (!current) return;
        const comfortRange = deriveComfortRange(current.maximumRange);
        set({
          profile: {
            ...current,
            comfortRange,
            trainingRange: computeTrainingRange(comfortRange, current.temporaryAdjustment),
            temporaryAdjustment: null,
          },
        });
      },

      setTemporaryAdjustment: (adjustment) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            temporaryAdjustment: adjustment,
            trainingRange: computeTrainingRange(current.comfortRange, adjustment),
          },
        });
      },

      clearProfile: () => set({ profile: null, hasOnboarded: false }),
      setAutoTranspose: (autoTranspose) => set({ autoTranspose }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'pitch-coach-profile',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, version) => {
        if (version >= 1) return persisted as ProfileState;
        // v0 shape: { range: { lowMidi, highMidi, measuredAt } | null, autoTranspose }
        const old = persisted as { range?: PitchRange & { measuredAt: number }; autoTranspose?: boolean } | null;
        const oldRange = old?.range;
        const maximumRange: PitchRange | null = oldRange ? { lowMidi: oldRange.lowMidi, highMidi: oldRange.highMidi } : null;
        const comfortRange = maximumRange ? deriveComfortRange(maximumRange) : null;
        return {
          profile:
            maximumRange && comfortRange
              ? {
                  maximumRange,
                  comfortRange,
                  trainingRange: comfortRange,
                  detectedAt: oldRange!.measuredAt,
                  confidence: 0.7,
                  temporaryAdjustment: null,
                }
              : null,
          // an existing user who already measured a range has effectively
          // onboarded; don't force them through the new flow retroactively
          hasOnboarded: Boolean(oldRange),
          autoTranspose: old?.autoTranspose ?? true,
        } satisfies Partial<ProfileState> as ProfileState;
      },
    }
  )
);
