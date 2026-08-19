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
import type { ActivityKind, DailyLesson, LessonSlot } from './types';

/** one serialized lesson step — everything the guided flow needs to run it */
export interface GuidedStep {
  slot: LessonSlot;
  kind: ActivityKind;
  activityId: string;
  difficultyId?: string;
  title: string;
  reason: string;
  estMinutes: number;
}

interface LessonSessionState {
  dayKey: string | null;
  steps: GuidedStep[];
  estMinutes: number;
  completedSlots: LessonSlot[];
  /** the step the user is currently inside, null between steps */
  activeSlot: LessonSlot | null;

  /** snapshot a fresh plan when the day changes; no-op for the same day */
  ensureDay(dayKey: string, generate: () => DailyLesson): void;
  begin(slot: LessonSlot): void;
  /** mark the active step done and clear it */
  completeActive(): void;
  clearActive(): void;
}

export const useLessonSessionStore = create<LessonSessionState>()(
  persist(
    (set, get) => ({
      dayKey: null,
      steps: [],
      estMinutes: 0,
      completedSlots: [],
      activeSlot: null,

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
          })),
          estMinutes: lesson.estMinutes,
          completedSlots: [],
          activeSlot: null,
        });
      },

      begin: (slot) => set({ activeSlot: slot }),

      completeActive() {
        const { activeSlot, completedSlots } = get();
        if (!activeSlot) return;
        set({
          activeSlot: null,
          completedSlots: completedSlots.includes(activeSlot) ? completedSlots : [...completedSlots, activeSlot],
        });
      },

      clearActive: () => set({ activeSlot: null }),
    }),
    {
      name: 'lesson-session-v1',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

/** the first step of the day's plan that isn't done yet, or null when finished */
export function nextGuidedStep(state: Pick<LessonSessionState, 'steps' | 'completedSlots'>): GuidedStep | null {
  return state.steps.find((s) => !state.completedSlots.includes(s.slot)) ?? null;
}
