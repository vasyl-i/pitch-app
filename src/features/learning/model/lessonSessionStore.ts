/**
 * Today's guided practice: a per-day snapshot of the generated lesson plus
 * which steps are already done. Persisted so closing the app mid-lesson
 * resumes at the same step.
 *
 * The plan is snapshotted once per day rather than regenerated on every
 * render: the generator's inputs (novelty, fatigue, mastery) shift as steps
 * complete, and the plan a user is halfway through must not reshuffle under
 * them.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import type { RoundScore } from '@/features/ear-training';
import { CATALOG } from '../lib/catalog';
import type { ActivityKind, DailyLesson, LessonSlot } from './types';

/** saved mid-exercise round progress for resumption */
export interface PartialProgress {
  completedRounds: number;
  results: RoundScore[];
  lastAnswerPc: number | undefined;
  savedAt: number;
}

/** one serialized lesson step — everything the guided flow needs to run it */
export interface GuidedStep {
  slot: LessonSlot;
  kind: ActivityKind;
  activityId: string;
  difficultyId?: string;
  title: string;
  reason: string;
  estMinutes: number;
  totalRounds: number;
}

interface LessonSessionState {
  dayKey: string | null;
  steps: GuidedStep[];
  estMinutes: number;
  completedSlots: LessonSlot[];
  /** the step the user is currently inside, null between steps */
  activeSlot: LessonSlot | null;
  /** epoch ms of last completedSlots mutation (for sync conflict resolution) */
  updatedAt: number;
  /** partial round progress for exercises exited mid-session, keyed by LessonSlot */
  partialProgress: Record<string, PartialProgress>;

  /** snapshot a fresh plan when the day changes; no-op for the same day */
  ensureDay(dayKey: string, generate: () => DailyLesson): void;
  begin(slot: LessonSlot): void;
  /** mark the active step done and clear it */
  completeActive(): void;
  clearActive(): void;
  /** remove a slot from completedSlots (for redo) */
  removeCompleted(slot: LessonSlot): void;
  /** save mid-exercise round progress for later resumption */
  savePartial(slot: LessonSlot, progress: PartialProgress): void;
  /** clear partial progress (on full completion or redo) */
  clearPartial(slot: LessonSlot): void;
}

export const useLessonSessionStore = create<LessonSessionState>()(
  persist(
    (set, get) => ({
      dayKey: null,
      steps: [],
      estMinutes: 0,
      completedSlots: [],
      activeSlot: null,
      updatedAt: 0,
      partialProgress: {},

      ensureDay(dayKey, generate) {
        if (get().dayKey === dayKey) return;
        const lesson = generate();
        set({
          dayKey,
          steps: lesson.steps.map((s) => ({
            slot: s.slot,
            kind: s.activity.kind,
            activityId: s.activity.id,
            difficultyId: s.difficultyId,
            title: s.activity.title,
            reason: s.reason,
            estMinutes: s.estMinutes,
            totalRounds: s.activity.rounds,
          })),
          estMinutes: lesson.estMinutes,
          completedSlots: [],
          activeSlot: null,
          partialProgress: {},
        });
      },

      begin: (slot) => set({ activeSlot: slot }),

      completeActive() {
        const { activeSlot, completedSlots, partialProgress } = get();
        if (!activeSlot) return;
        const { [activeSlot]: _, ...rest } = partialProgress;
        set({
          activeSlot: null,
          completedSlots: completedSlots.includes(activeSlot) ? completedSlots : [...completedSlots, activeSlot],
          partialProgress: rest,
          updatedAt: Date.now(),
        });
      },

      clearActive: () => set({ activeSlot: null }),

      removeCompleted(slot) {
        const { [slot]: _, ...rest } = get().partialProgress;
        set({
          completedSlots: get().completedSlots.filter((s) => s !== slot),
          partialProgress: rest,
          updatedAt: Date.now(),
        });
      },

      savePartial(slot, progress) {
        set({
          partialProgress: { ...get().partialProgress, [slot]: progress },
          updatedAt: Date.now(),
        });
      },

      clearPartial(slot) {
        const { [slot]: _, ...rest } = get().partialProgress;
        set({ partialProgress: rest, updatedAt: Date.now() });
      },
    }),
    {
      name: 'lesson-session-v1',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      migrate(persisted: unknown) {
        const state = persisted as Record<string, unknown>;
        // Patch old steps that are missing totalRounds
        if (Array.isArray(state.steps)) {
          state.steps = (state.steps as GuidedStep[]).map((s) => {
            if (s.totalRounds) return s;
            const activity = CATALOG.find((a) => a.id === s.activityId && a.kind === s.kind);
            return { ...s, totalRounds: activity?.rounds ?? 1 };
          });
        }
        if (!state.partialProgress) state.partialProgress = {};
        return state as unknown as LessonSessionState;
      },
    }
  )
);

/** the first step of the day's plan that isn't done yet, or null when finished */
export function nextGuidedStep(state: Pick<LessonSessionState, 'steps' | 'completedSlots'>): GuidedStep | null {
  return state.steps.find((s) => !state.completedSlots.includes(s.slot)) ?? null;
}
