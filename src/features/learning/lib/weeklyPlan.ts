/**
 * Pure helpers for the user's custom weekly exercise plan.
 *
 * All functions are side-effect-free — they take data and return data.
 * The UI and stores compose them; nothing here touches React or Zustand.
 */
import { capacitySeconds } from './budget';
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
 * How many different exercises a day holds at least, for its time budget.
 * Each one is then stretched with repetitions to fill the budget (see
 * `fitLessonToBudget`); a day whose picks can't stretch that far — songs run
 * once — gets more exercises (see `planVariedWeek`).
 */
function exerciseCountForBudget(minutes: number): number {
  if (minutes <= 5) return 3;
  if (minutes <= 10) return 5;
  if (minutes <= 15) return 7;
  if (minutes <= 20) return 8;
  return 9;
}

/** a day never holds more exercises than this, however short they are */
export const MAX_EXERCISES_PER_DAY = 12;

/** Warm-ups and cool-downs come from activities at or below this challenge. */
const EASY_CHALLENGE = 0.35;

export type VariedDayRole = 'warmup' | 'core' | 'cooldown';

/** Where each exercise sits in a day of `count` exercises: easy in, cores, easy out. */
function dayRoles(count: number): VariedDayRole[] {
  if (count <= 1) return ['warmup'];
  if (count === 2) return ['warmup', 'core'];
  return ['warmup', ...Array<VariedDayRole>(count - 2).fill('core'), 'cooldown'];
}

/**
 * Least-recently-used rotation over a seeded shuffle: every pick goes to the
 * back of the line, so the whole pool gets cycled through before anything
 * comes back round.
 */
function rotation(pool: readonly Activity[], rand: () => number) {
  const queue = [...pool];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  const take = (excluded: (a: Activity) => boolean): Activity | undefined => {
    const index = queue.findIndex((a) => !excluded(a));
    if (index < 0) return undefined;
    const [picked] = queue.splice(index, 1);
    queue.push(picked);
    return picked;
  };
  return {
    /** next activity not used today, preferring ones that weren't on yesterday's list either */
    next(today: ReadonlySet<string>, yesterday: ReadonlySet<string>): Activity | undefined {
      return take((a) => today.has(a.id) || yesterday.has(a.id)) ?? take((a) => today.has(a.id));
    },
  };
}

/**
 * A week of varied practice days (index 0 = Monday) from the tier's catalog.
 *
 * Each day opens with an easy warm-up, ends with an easy cool-down when the
 * budget allows, and fills the middle with core work. Picks rotate through
 * the whole pool so the week covers everything available, and no exercise
 * repeats on consecutive days while the pool is big enough to avoid it. A
 * day whose exercises can't stretch to the budget (see `capacitySeconds`)
 * takes extra cores until they can.
 * A Premium day's first core comes from the Premium-only library, so every
 * Premium day shows it off — and a plan without any is recognisably a free
 * one; the rest of its cores draw on everything.
 */
export function planVariedWeek(
  dailyMinutes: number,
  tier: 'free' | 'premium',
  rand: () => number,
): { role: VariedDayRole; activity: Activity }[][] {
  const pool = catalogForTier(tier);
  const easy = pool.filter((a) => a.challenge <= EASY_CHALLENGE);
  const premiumOnly = tier === 'premium' ? pool.filter((a) => a.tier === 'premium') : [];
  const easyRotation = rotation(easy.length > 0 ? easy : pool, rand);
  const coreRotation = rotation(pool, rand);
  const premiumRotation = premiumOnly.length > 0 ? rotation(premiumOnly, rand) : null;
  const roles = dayRoles(exerciseCountForBudget(dailyMinutes));

  const week: { role: VariedDayRole; activity: Activity }[][] = [];
  let yesterday = new Set<string>();
  for (let day = 0; day < 7; day++) {
    const today = new Set<string>();
    const picks = new Map<number, Activity>();
    // easy slots first: cores may draw from the easy pool too, and a small
    // pool can't spare them for the cool-down afterwards
    const order = roles.map((role, i) => ({ role, i })).sort((a, b) => Number(a.role === 'core') - Number(b.role === 'core'));
    const firstCore = roles.indexOf('core');
    for (const { role, i } of order) {
      const rotationFor = role !== 'core' ? easyRotation : i === firstCore && premiumRotation ? premiumRotation : coreRotation;
      const activity = rotationFor.next(today, yesterday);
      if (!activity) continue;
      today.add(activity.id);
      picks.set(i, activity);
    }
    const day = roles.flatMap((role, i) => (picks.has(i) ? [{ role, activity: picks.get(i)! }] : []));
    let capacity = day.reduce((sum, { activity }) => sum + capacitySeconds(activity), 0);
    while (capacity < dailyMinutes * 60 && day.length < MAX_EXERCISES_PER_DAY) {
      const activity = coreRotation.next(today, yesterday);
      if (!activity) break;
      today.add(activity.id);
      capacity += capacitySeconds(activity);
      // before the cool-down, which stays last
      const at = day[day.length - 1]?.role === 'cooldown' ? day.length - 1 : day.length;
      day.splice(at, 0, { role: 'core', activity });
    }
    week.push(day);
    yesterday = today;
  }
  return week;
}

/**
 * Generate a default weekly plan — after onboarding, on upgrading to Premium,
 * or to replace a legacy plan that repeated one list all week.
 *
 * Every day gets its own list (see `planVariedWeek`); users can then edit
 * individual days. Premium users get the full catalog; free users get free
 * exercises only. Unseeded by default: the plan is stored, not re-derived.
 */
export function generateDefaultWeeklyPlan(
  dailyMinutes: DailyMinutes = 10,
  tier: 'free' | 'premium' = 'free',
  rand: () => number = Math.random,
): WeeklyPlan {
  const plan: WeeklyPlan = {};
  planVariedWeek(dailyMinutes, tier, rand).forEach((steps, day) => {
    plan[day as WeekdayIndex] = steps.map(({ activity }) => ({
      activityId: activity.id,
      kind: activity.kind,
      difficultyId: activity.difficulties?.[0] ?? undefined,
    }));
  });
  return plan;
}

/** Whether any day of the plan uses a Premium activity. */
export function planHasPremiumActivity(plan: WeeklyPlan): boolean {
  return Object.values(plan).some((entries) =>
    resolveEntries(entries ?? []).some(({ activity }) => activity.tier === 'premium'),
  );
}

/**
 * Everything a free plan could hold before the interval/chord ear drills and
 * the scale/arpeggio warm-ups were made free (Oct 2026).
 */
const LEGACY_FREE_ACTIVITY_IDS: ReadonlySet<string> = new Set([
  'note-echo', 'melody-echo', 'pitch-memory', 'chord-tones',
  'twinkle', 'mary-lamb', 'frere-jacques', 'ode-to-joy', 'c-major-scale',
]);

/**
 * Whether the plan was built from the old, smaller free catalog: it holds
 * exercises, all of them from that set. A plan with anything newer in it was
 * made (or edited) since, and is left alone.
 */
export function planPredatesFreeCatalogExpansion(plan: WeeklyPlan): boolean {
  const entries = Object.values(plan).flatMap((e) => e ?? []);
  return entries.length > 0 && entries.every((e) => LEGACY_FREE_ACTIVITY_IDS.has(e.activityId));
}

/**
 * Whether every day of the week holds the same exercise list — the shape the
 * old default plan (and `weeklyPlanFromSteps`) produced, which is what made
 * consecutive days feel identical.
 */
export function planRepeatsEveryDay(plan: WeeklyPlan): boolean {
  const days = Array.from({ length: 7 }, (_, d) =>
    (plan[d as WeekdayIndex] ?? []).map((e) => `${e.kind}:${e.activityId}`).join(','),
  );
  return days[0] !== '' && days.every((d) => d === days[0]);
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
