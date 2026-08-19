/**
 * The free tier's daily practice.
 *
 * Free users get a real, complete session every day — warm-up, two focus
 * exercises, cool down — drawn from a fixed beginner progression that rotates
 * by day. What it does *not* do is look at the singer: no skill profile, no
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
import type { Activity, DailyLesson, LessonSlot, LessonStep } from '../model/types';
import { FREE_CATALOG } from './catalog';
import { hashSeed, mulberry32 } from './seeded';

/**
 * The shape of a free day. Fewer slots than the adaptive lesson — no review
 * slot (that needs spaced repetition) and no challenge slot (that needs a
 * difficulty estimate) — but still a complete, sensibly-paced session.
 */
const FREE_SLOTS: LessonSlot[] = ['warmup', 'core-1', 'core-2', 'cooldown'];

/** why each slot is here — fixed copy, because there is no personal reason to give */
const FREE_REASONS: Record<LessonSlot, string> = {
  warmup: 'gentle start to wake up your voice and ear',
  'core-1': 'core practice from the beginner progression',
  'core-2': 'a second focus, for variety across the week',
  review: 'revisiting earlier material',
  challenge: 'a step beyond your comfort zone',
  cooldown: 'finish relaxed — an easy rep you can nail',
};

export interface FixedLessonInput {
  /** local calendar day key — the determinism anchor */
  dayKey: string;
  /** how long the user said they want to practise; trims the plan */
  dailyMinutes?: number;
}

function slotsForBudget(minutes: number): LessonSlot[] {
  if (minutes <= 5) return ['warmup', 'core-1'];
  if (minutes <= 10) return ['warmup', 'core-1', 'cooldown'];
  return FREE_SLOTS;
}

/** pick from a pool with a day-seeded rotation, skipping anything already used */
function rotate(pool: Activity[], seed: number, used: Set<string>): Activity | undefined {
  const available = pool.filter((a) => !used.has(a.id));
  if (available.length === 0) return undefined;
  return available[seed % available.length];
}

/**
 * Today's fixed practice plan.
 *
 * Signature-compatible in spirit with `generateDailyLesson` — both return a
 * `DailyLesson` — so the guided flow, the lesson snapshot store and the Home
 * screen consume either one without knowing which tier produced it. Swapping
 * tiers changes the *content* of Home, never its structure.
 */
export function generateFixedLesson(input: FixedLessonInput): DailyLesson {
  const rand = mulberry32(hashSeed(`fixed:${input.dayKey}`));
  const seed = Math.floor(rand() * 10_000);

  const easy = FREE_CATALOG.filter((a) => a.challenge <= 0.3);
  const warmups = easy.filter((a) =>
    a.skills.some((s) => s === 'voice-control' || s === 'pitch-stability' || s === 'pitch-accuracy')
  );
  // ordered easiest-first so the fixed progression stays beginner-appropriate
  const cores = [...FREE_CATALOG].sort((a, b) => a.challenge - b.challenge);

  const slots = slotsForBudget(input.dailyMinutes ?? 15);
  const used = new Set<string>();
  const steps: LessonStep[] = [];

  const push = (slot: LessonSlot, activity: Activity | undefined) => {
    if (!activity) return;
    used.add(activity.id);
    steps.push({
      slot,
      activity,
      // first (easiest) tier: without a skill profile there is nothing to
      // adapt to, and guessing high on a beginner is how people quit
      difficultyId: activity.difficulties?.[0],
      reason: FREE_REASONS[slot],
      estMinutes: activity.minutes,
    });
  };

  if (slots.includes('warmup')) push('warmup', rotate(warmups.length > 0 ? warmups : easy, seed, used));
  if (slots.includes('core-1')) push('core-1', rotate(cores, seed + 1, used));
  if (slots.includes('core-2')) push('core-2', rotate(cores, seed + 2, used));
  if (slots.includes('cooldown')) push('cooldown', rotate(easy, seed + 3, used));

  return {
    dayKey: input.dayKey,
    focus: null,
    steps,
    estMinutes: steps.reduce((sum, s) => sum + s.estMinutes, 0),
  };
}
