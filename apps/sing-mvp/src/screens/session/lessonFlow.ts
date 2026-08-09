/**
 * The guided daily-practice flow. Home shows one CTA; this module turns it
 * into a coached sequence: snapshot today's lesson, launch the next step as a
 * full-screen session, and advance step → step → summary as each finishes.
 * The user never picks an exercise.
 */
import {
  catalogForTier,
  generateDailyLesson,
  generateFixedLesson,
  nextGuidedStep,
  useLearningStore,
  useLessonSessionStore,
  usePreferencesStore,
  SLOT_LABELS,
} from '@/features/learning';
import type { GuidedStep } from '@/features/learning';
import { currentStreak, localDayKey, noteHeatmap, useProgressStore } from '@/features/progress';
import { resolveEntitlements, useSubscriptionStore } from '@/features/subscription';

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** whether today's plan should be the adaptive one */
function adaptiveUnlocked(): boolean {
  return resolveEntitlements(useSubscriptionStore.getState().subscription)['adaptive-lessons'];
}

/**
 * The key today's plan is snapshotted under.
 *
 * The tier is part of it deliberately: upgrading has to change Home *now*.
 * Keying on the date alone would leave someone who just paid staring at the
 * same fixed plan until tomorrow — the worst possible first minute of a
 * subscription. Lapsing regenerates for the same reason.
 */
export function planKey(now = new Date()): string {
  return `${todayKey(now)}:${adaptiveUnlocked() ? 'adaptive' : 'fixed'}`;
}

/**
 * Generate today's lesson from the live stores (deterministic per day).
 *
 * Free gets the fixed beginner progression; Premium gets the adaptive
 * generator over the full catalog. Both return a `DailyLesson`, so everything
 * downstream — the snapshot store, the guided flow, Home — is identical
 * either way.
 */
function generateToday() {
  const sessions = useProgressStore.getState().sessions;
  const learning = useLearningStore.getState();
  const prefs = usePreferencesStore.getState().preferences;

  if (!adaptiveUnlocked()) {
    return generateFixedLesson({ dayKey: todayKey(), dailyMinutes: prefs?.dailyMinutes });
  }

  learning.ensureWeek(prefs);
  const today = localDayKey(Date.now());
  const minutesToday =
    sessions.filter((s) => localDayKey(s.at) === today).reduce((sum, s) => sum + (s.durationSec ?? 0), 0) / 60;
  return generateDailyLesson({
    dayKey: todayKey(),
    prefs,
    skills: learning.skills,
    reviews: learning.reviews,
    focus: useLearningStore.getState().weeklyFocus?.skill ?? null,
    streak: currentStreak(sessions),
    annotations: learning.annotations,
    tendencies: noteHeatmap(sessions),
    minutesPracticedToday: minutesToday,
    catalog: catalogForTier('premium'),
  });
}

/**
 * Snapshot today's plan once every persisted store is hydrated — snapshotting
 * from empty stores would freeze a junk plan for the whole day. Calls `ready`
 * (immediately when already hydrated) once the plan for today exists.
 */
export function ensureTodaysLesson(ready?: () => void) {
  // the subscription store is in this list for the same reason as the others:
  // generating before it hydrates would snapshot a *free* plan for a paying
  // user and freeze it there for the rest of the day
  const stores = [
    useProgressStore,
    useLearningStore,
    usePreferencesStore,
    useLessonSessionStore,
    useSubscriptionStore,
  ] as const;
  let remaining = stores.length;
  const arrive = () => {
    remaining -= 1;
    if (remaining > 0) return;
    useLessonSessionStore.getState().ensureDay(planKey(), generateToday);
    ready?.();
  };
  for (const store of stores) {
    if (store.persist.hasHydrated()) arrive();
    else store.persist.onFinishHydration(arrive);
  }
}

/** the navigation calls the flow makes, structurally (any root-composite prop fits) */
interface FlowNavigation {
  navigate(screen: 'EarSession', params: { exerciseId: string; difficultyId?: string; guided: boolean }): void;
  navigate(screen: 'MelodyPractice', params: { exerciseId: string; guided: boolean }): void;
}

interface FlowReplaceNavigation {
  replace(screen: 'EarSession', params: { exerciseId: string; difficultyId?: string; guided: boolean }): void;
  replace(screen: 'MelodyPractice', params: { exerciseId: string; guided: boolean }): void;
  replace(screen: 'PracticeComplete'): void;
}

/** Start a specific step of today's plan — used by both the primary CTA and tapping a plan row directly */
export function beginStep(step: GuidedStep, navigation: FlowNavigation) {
  useLessonSessionStore.getState().begin(step.slot);
  if (step.kind === 'melody') {
    navigation.navigate('MelodyPractice', { exerciseId: step.activityId, guided: true });
  } else {
    navigation.navigate('EarSession', { exerciseId: step.activityId, difficultyId: step.difficultyId, guided: true });
  }
}

/** Home's CTA: start (or resume) today's practice at the next unfinished step */
export function continuePractice(navigation: FlowNavigation) {
  const step = nextGuidedStep(useLessonSessionStore.getState());
  if (!step) return;
  beginStep(step, navigation);
}

/** a guided session finished: mark the step done and roll into the next one */
export function advanceAfterStep(navigation: FlowReplaceNavigation) {
  const store = useLessonSessionStore.getState();
  store.completeActive();
  const step = nextGuidedStep(useLessonSessionStore.getState());
  if (!step) {
    navigation.replace('PracticeComplete');
    return;
  }
  useLessonSessionStore.getState().begin(step.slot);
  if (step.kind === 'melody') {
    navigation.replace('MelodyPractice', { exerciseId: step.activityId, guided: true });
  } else {
    navigation.replace('EarSession', { exerciseId: step.activityId, difficultyId: step.difficultyId, guided: true });
  }
}

/** "Step 2 of 5 · Warm-up" — the guided header line for the active step */
export function activeStepLabel(): string | null {
  const { steps, activeSlot } = useLessonSessionStore.getState();
  if (!activeSlot) return null;
  const index = steps.findIndex((s) => s.slot === activeSlot);
  if (index < 0) return null;
  return `Step ${index + 1} of ${steps.length} · ${SLOT_LABELS[activeSlot]}`;
}
