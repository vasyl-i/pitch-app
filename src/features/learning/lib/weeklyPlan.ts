/**
 * Pure helpers for the user's custom weekly exercise plan.
 *
 * All functions are side-effect-free — they take data and return data.
 * The UI and stores compose them; nothing here touches React or Zustand.
 */
import { activityById, catalogForTier } from './catalog';
import type { Activity, DailyMinutes, WeekdayIndex, WeeklyExerciseEntry, WeeklyPlan } from '../model/types';

export const MIN_DAILY_MINUTES = 5;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Resolve an entry to its catalog Activity, returning null if the id is stale. */
function resolveOne(entry: WeeklyExerciseEntry): Activity | null {
  return activityById(entry.kind, entry.activityId) ?? null;
}

/** Resolve a day's entries, silently dropping any whose catalog id no longer exists. */
export function resolveEntries(entries: WeeklyExerciseEntry[]): { entry: WeeklyExerciseEntry; activity: Activity }[] {
  const result: { entry: WeeklyExerciseEntry; activity: Activity }[] = [];
  for (const entry of entries) {
    const activity = resolveOne(entry);
    if (activity) result.push({ entry, activity });
  }
  return result;
}

/** Total estimated minutes for a day's exercise list. */
export function dayTotalMinutes(entries: WeeklyExerciseEntry[]): number {
  return resolveEntries(entries).reduce((sum, { activity }) => sum + activity.minutes, 0);
}

/** Whether removing the entry at `index` would leave the day below the minimum. */
export function canRemoveExercise(entries: WeeklyExerciseEntry[], index: number): boolean {
  if (index < 0 || index >= entries.length) return false;
  const without = entries.filter((_, i) => i !== index);
  if (without.length === 0) return true; // clearing the whole day is fine
  return dayTotalMinutes(without) >= MIN_DAILY_MINUTES;
}

/**
 * Convert the JS Date weekday (0=Sun) to our ISO index (0=Mon).
 * Useful for looking up today's custom plan.
 */
export function jsDateToWeekdayIndex(date: Date): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const d = date.getDay(); // 0=Sun … 6=Sat
  return (d === 0 ? 6 : d - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * How many exercises fit in a day given the time budget.
 * Mirrors the slot budget from fixedProgression.
 */
function exerciseCountForBudget(minutes: DailyMinutes): number {
  if (minutes <= 5) return 2;
  if (minutes <= 10) return 3;
  return 4;
}

/**
 * Generate a default weekly plan after onboarding.
 *
 * Every day gets the same exercise list — a rotation through the tier-appropriate
 * catalog sized to the daily minute budget. Users can then edit individual days.
 * Premium users get the full catalog; free users get free exercises only.
 */
export function generateDefaultWeeklyPlan(dailyMinutes: DailyMinutes = 10, tier: 'free' | 'premium' = 'free'): WeeklyPlan {
  const count = exerciseCountForBudget(dailyMinutes);
  const pool = catalogForTier(tier);
  const plan: WeeklyPlan = {};

  // Pick exercises sorted easiest-first (same strategy as fixedProgression):
  const sorted = [...pool].sort((a, b) => a.challenge - b.challenge);
  const picked = sorted.slice(0, count);

  const entries: WeeklyExerciseEntry[] = picked.map((a) => ({
    activityId: a.id,
    kind: a.kind,
    difficultyId: a.difficulties?.[0] ?? undefined,
  }));

  // Same exercises every day
  for (let day = 0; day < 7; day++) {
    plan[day as WeekdayIndex] = [...entries];
  }

  return plan;
}

/**
 * Build a weekly plan from the currently active lesson steps.
 * Used for existing users who already have a generated daily lesson —
 * populates every day with the same exercises shown in "Today's plan".
 */
export function weeklyPlanFromSteps(
  steps: readonly { kind: string; activityId: string; difficultyId?: string }[],
): WeeklyPlan {
  const entries: WeeklyExerciseEntry[] = steps.map((s) => ({
    activityId: s.activityId,
    kind: s.kind as WeeklyExerciseEntry['kind'],
    difficultyId: s.difficultyId,
  }));

  const plan: WeeklyPlan = {};
  for (let day = 0; day < 7; day++) {
    plan[day as WeekdayIndex] = [...entries];
  }
  return plan;
}
