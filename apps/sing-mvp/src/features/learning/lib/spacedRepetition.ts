/**
 * Spaced repetition over *skills* (not cards): after a skill is practiced,
 * the next review lands tomorrow → 3 days → 1 week → 2 weeks → 1 month →
 * 3 months. A shaky result steps the interval back down, and weak skills are
 * capped at short intervals so they keep coming around until mastery grows.
 */
import type { ReviewState, SkillId, SkillState } from '../model/types';

export const REVIEW_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30, 90];

const DAY_MS = 24 * 60 * 60 * 1000;
/** a session at or above this score counts as a successful review */
const PASS_SCORE = 70;
/** below this mastery a skill never graduates past the 1-week interval */
const WEAK_MASTERY = 40;
const WEAK_MAX_INDEX = 2;

/** fold one practice result into the skill's review schedule */
export function scheduleReview(
  prev: ReviewState | undefined,
  score: number,
  mastery: number,
  at: number
): ReviewState {
  const maxIndex = REVIEW_INTERVALS_DAYS.length - 1;
  let index = prev?.intervalIndex ?? 0;
  index = score >= PASS_SCORE ? Math.min(index + 1, maxIndex) : Math.max(0, index - 1);
  if (mastery < WEAK_MASTERY) index = Math.min(index, WEAK_MAX_INDEX);
  return {
    intervalIndex: index,
    nextDueAt: at + REVIEW_INTERVALS_DAYS[index] * DAY_MS,
    lastPracticedAt: at,
  };
}

export function isDue(review: ReviewState, now: number): boolean {
  return now >= review.nextDueAt;
}

export function daysOverdue(review: ReviewState, now: number): number {
  return Math.max(0, Math.floor((now - review.nextDueAt) / DAY_MS));
}

export function daysSincePracticed(review: ReviewState, now: number): number {
  return Math.max(0, Math.round((now - review.lastPracticedAt) / DAY_MS));
}

export interface DueReview {
  skill: SkillId;
  overdueDays: number;
  daysSincePracticed: number;
}

/** due skills, weakest and most overdue first */
export function dueReviews(
  reviews: Partial<Record<SkillId, ReviewState>>,
  skills: Record<SkillId, SkillState>,
  now: number
): DueReview[] {
  const due: DueReview[] = [];
  for (const [skill, review] of Object.entries(reviews) as [SkillId, ReviewState][]) {
    if (!review || !isDue(review, now)) continue;
    due.push({ skill, overdueDays: daysOverdue(review, now), daysSincePracticed: daysSincePracticed(review, now) });
  }
  return due.sort((a, b) => {
    const weakness = skills[a.skill].mastery - skills[b.skill].mastery;
    return weakness !== 0 ? weakness : b.overdueDays - a.overdueDays;
  });
}
