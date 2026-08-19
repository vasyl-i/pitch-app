import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateDailyLesson, type LessonInput } from '../lib/lessonGenerator';
import { DEFAULT_PREFERENCES } from '../model/preferencesStore';
import type { DailyMinutes } from '../model/types';
import { makeSkills, trained } from './helpers';

function input(overrides: Partial<LessonInput> = {}): LessonInput {
  return {
    dayKey: '2026-07-19',
    prefs: { ...DEFAULT_PREFERENCES, dailyMinutes: 15, updatedAt: 0 },
    skills: makeSkills(),
    reviews: {},
    focus: null,
    streak: 3,
    annotations: [],
    tendencies: [],
    minutesPracticedToday: 0,
    ...overrides,
  };
}

const shape = (lesson: ReturnType<typeof generateDailyLesson>) =>
  lesson.steps.map((s) => `${s.slot}:${s.activity.id}:${s.difficultyId ?? '-'}`);

test('the same day and profile always generate the identical lesson', () => {
  assert.deepEqual(shape(generateDailyLesson(input())), shape(generateDailyLesson(input())));
});

test('different days generate different lessons', () => {
  const days = ['2026-07-19', '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'];
  const shapes = new Set(days.map((dayKey) => shape(generateDailyLesson(input({ dayKey }))).join('|')));
  assert.ok(shapes.size >= 3, `expected variety across days, got ${shapes.size} distinct lessons`);
});

test('the time budget controls the lesson structure', () => {
  const stepsFor = (dailyMinutes: DailyMinutes) =>
    generateDailyLesson(input({ prefs: { ...DEFAULT_PREFERENCES, dailyMinutes, updatedAt: 0 } })).steps;
  assert.equal(stepsFor(5).length, 3);
  assert.deepEqual(
    stepsFor(30).map((s) => s.slot),
    ['warmup', 'core-1', 'core-2', 'review', 'challenge', 'cooldown'].filter((slot) =>
      stepsFor(30).some((s) => s.slot === slot)
    )
  );
  assert.ok(stepsFor(30).length >= 5, 'a 30-minute budget fills most slots');
});

test('no activity repeats within one lesson, and every step has a reason', () => {
  const lesson = generateDailyLesson(input({ prefs: { ...DEFAULT_PREFERENCES, dailyMinutes: 30, updatedAt: 0 } }));
  const ids = lesson.steps.map((s) => s.activity.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const step of lesson.steps) assert.ok(step.reason.length > 5, `step ${step.slot} needs a reason`);
});

test('a due review pulls its skill into the review slot', () => {
  const T0 = Date.parse('2026-07-19');
  const lesson = generateDailyLesson(
    input({
      skills: makeSkills({ 'chord-recognition': { ...trained(45, 6) } }),
      reviews: { 'chord-recognition': { intervalIndex: 1, nextDueAt: T0 - 86_400_000, lastPracticedAt: T0 - 4 * 86_400_000 } },
    })
  );
  const review = lesson.steps.find((s) => s.slot === 'review');
  assert.ok(review, 'a 15-minute lesson includes the review slot');
  assert.ok(review!.activity.skills.includes('chord-recognition'), `review step should target the due skill`);
});

test('the weekly focus shapes core selection', () => {
  const focused = generateDailyLesson(input({ focus: 'chord-recognition' }));
  const trainsFocus = focused.steps.some((s) => s.activity.skills.includes('chord-recognition'));
  assert.ok(trainsFocus, 'focus week should surface focus-skill work');
});

test('heavy practice today turns the challenge slot into recovery', () => {
  const base = input({
    prefs: { ...DEFAULT_PREFERENCES, dailyMinutes: 20, updatedAt: 0 },
    skills: makeSkills({ 'pitch-accuracy': { ...trained(80, 20) } }),
  });
  const rested = generateDailyLesson(base);
  const fatigued = generateDailyLesson({ ...base, minutesPracticedToday: 45 });
  const challengeOf = (l: typeof rested) => l.steps.find((s) => s.slot === 'challenge');
  assert.ok(challengeOf(rested));
  const recovery = challengeOf(fatigued);
  assert.ok(recovery && recovery.activity.challenge <= 0.3, 'fatigued challenge slot should be gentle');
});
