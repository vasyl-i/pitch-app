import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueReviews, REVIEW_INTERVALS_DAYS, scheduleReview } from '../lib/spacedRepetition';
import { makeSkills } from './helpers';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

test('successful reviews walk the interval ladder: 1 → 3 → 7 → 14 → 30 → 90 days', () => {
  let review = scheduleReview(undefined, 85, 60, T0);
  const seen = [REVIEW_INTERVALS_DAYS[review.intervalIndex]];
  for (let i = 0; i < 5; i++) {
    review = scheduleReview(review, 85, 60, review.nextDueAt);
    seen.push(REVIEW_INTERVALS_DAYS[review.intervalIndex]);
  }
  assert.deepEqual(seen, [3, 7, 14, 30, 90, 90]);
});

test('a shaky result steps the interval back down', () => {
  let review = scheduleReview(undefined, 85, 60, T0);
  review = scheduleReview(review, 85, 60, T0 + DAY); // index 2 (7d)
  const lapsed = scheduleReview(review, 40, 60, T0 + 2 * DAY);
  assert.ok(lapsed.intervalIndex < review.intervalIndex);
});

test('weak skills never graduate past the 1-week interval', () => {
  let review = scheduleReview(undefined, 95, 30, T0);
  for (let i = 0; i < 6; i++) review = scheduleReview(review, 95, 30, T0 + i * DAY);
  assert.ok(REVIEW_INTERVALS_DAYS[review.intervalIndex] <= 7, 'weak skills must come around at least weekly');
});

test('due reviews list the weakest skills first', () => {
  const skills = makeSkills({
    'pitch-accuracy': { mastery: 80 },
    'chord-recognition': { mastery: 25 },
  });
  const reviews = {
    'pitch-accuracy': { intervalIndex: 1, nextDueAt: T0 - DAY, lastPracticedAt: T0 - 4 * DAY },
    'chord-recognition': { intervalIndex: 1, nextDueAt: T0 - DAY, lastPracticedAt: T0 - 4 * DAY },
  };
  const due = dueReviews(reviews, skills, T0);
  assert.equal(due[0].skill, 'chord-recognition');
  assert.equal(due.length, 2);
});

test('not-yet-due reviews are excluded', () => {
  const skills = makeSkills();
  const reviews = { 'pitch-accuracy': { intervalIndex: 2, nextDueAt: T0 + DAY, lastPracticedAt: T0 } };
  assert.deepEqual(dueReviews(reviews, skills, T0), []);
});
