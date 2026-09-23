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
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import type { PitchRange } from '@/shared/lib/music';
import { deriveComfortRange } from '../lib/comfort';

export type OnboardingStep = 'not-started' | 'range-complete' | 'goals-complete' | 'complete';

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
  /** granular onboarding progress — survives app kills between steps */
  onboardingStep: OnboardingStep;
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
  /** advance onboarding to a specific step without marking fully complete */
  advanceOnboarding: (step: OnboardingStep) => void;
  /** mark onboarding as fully done (reminder set/skipped) */
  completeOnboarding: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      hasOnboarded: false,
      onboardingStep: 'not-started' as OnboardingStep,
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
          onboardingStep: 'range-complete',
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

      clearProfile: () => set({ profile: null, hasOnboarded: false, onboardingStep: 'not-started' }),
      setAutoTranspose: (autoTranspose) => set({ autoTranspose }),
      advanceOnboarding: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ hasOnboarded: true, onboardingStep: 'complete' }),
    }),
    {
      name: 'pitch-coach-profile',
      storage: createJSONStorage(() => mmkvStorage),
      version: 2,
      migrate: (persisted: unknown, version) => {
        if (version >= 2) return persisted as ProfileState;

        if (version === 1) {
          // v1 → v2: add onboardingStep derived from hasOnboarded
          const old = persisted as Omit<ProfileState, 'onboardingStep'> & { hasOnboarded: boolean };
          return {
            ...old,
            onboardingStep: old.hasOnboarded ? 'complete' : (old.profile ? 'range-complete' : 'not-started'),
          } as ProfileState;
        }

        // v0 shape: { range: { lowMidi, highMidi, measuredAt } | null, autoTranspose }
        const old = persisted as { range?: PitchRange & { measuredAt: number }; autoTranspose?: boolean } | null;
        const oldRange = old?.range;
        const maximumRange: PitchRange | null = oldRange ? { lowMidi: oldRange.lowMidi, highMidi: oldRange.highMidi } : null;
        const comfortRange = maximumRange ? deriveComfortRange(maximumRange) : null;
        const hasRange = Boolean(oldRange);
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
          hasOnboarded: hasRange,
          onboardingStep: hasRange ? 'complete' : 'not-started',
          autoTranspose: old?.autoTranspose ?? true,
        } satisfies Partial<ProfileState> as ProfileState;
      },
    }
  )
);
