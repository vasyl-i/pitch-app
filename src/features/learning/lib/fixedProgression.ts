/**
 * The free tier's daily practice.
 *
 * Free users get a real, complete session every day — warm-up, focus
 * exercises, cool down — drawn from the whole free catalog and rotated so
 * consecutive days don't repeat each other (see `planVariedWeek`). What it does *not* do is look at the singer: no skill profile, no
 * spaced repetition, no adaptive difficulty, no tendency correction. Everyone
 * on the same day gets the same plan.
 *
 * That split is the product in one file. Free is genuinely useful, so the app
 * is worth opening; Premium is genuinely different, because the same screen
 * starts rebuilding itself around what *this* voice actually does.
 *
 * Deterministic per day, like the adaptive generator, so the plan cannot
 * reshuffle under someone who is halfway through it.
 *
 * Pure — runs under `node --test`.
 */
import type { DailyLesson, LessonSlot, LessonStep } from '../model/types';
import { hashSeed, mulberry32 } from './seeded';
import { jsDateToWeekdayIndex, planVariedWeek, type VariedDayRole } from './weeklyPlan';

/** why each step is here — fixed copy, because there is no personal reason to give */
const FREE_REASONS: Record<VariedDayRole, string> = {
  warmup: 'gentle start to wake up your voice and ear',
  core: 'core practice from the free library',
  cooldown: 'finish relaxed — an easy rep you can nail',
};

export interface FixedLessonInput {
  /** local calendar day key (`YYYY-MM-DD`) — the determinism anchor */
  dayKey: string;
  /** how long the user said they want to practise; trims the plan */
  dailyMinutes?: number;
}

/**
 * Today's fixed practice plan.
 *
 * Signature-compatible in spirit with `generateDailyLesson` — both return a
 * `DailyLesson` — so the guided flow, the lesson snapshot store and the Home
 * screen consume either one without knowing which tier produced it. Swapping
 * tiers changes the *content* of Home, never its structure.
 *
 * The week is planned as a whole (seeded by its Monday) and today is read off
 * it, which keeps each day deterministic while still varying day to day.
 */
export function generateFixedLesson(input: FixedLessonInput): DailyLesson {
  const [y, m, d] = input.dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = jsDateToWeekdayIndex(date);
  const monday = new Date(y, m - 1, d - weekday);
  const rand = mulberry32(hashSeed(`fixed:${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`));
  const day = planVariedWeek(input.dailyMinutes ?? 15, 'free', rand)[weekday];

  let cores = 0;
  const steps: LessonStep[] = day.map(({ role, activity }) => {
    const slot: LessonSlot = role === 'core' ? `core-${++cores}` : role;
    return {
      slot,
      activity,
      // first (easiest) tier: without a skill profile there is nothing to
      // adapt to, and guessing high on a beginner is how people quit
      difficultyId: activity.difficulties?.[0],
      reason: FREE_REASONS[role],
      estMinutes: activity.minutes,
    };
  });

  return {
    dayKey: input.dayKey,
    focus: null,
    steps,
    estMinutes: steps.reduce((sum, s) => sum + s.estMinutes, 0),
  };
}
