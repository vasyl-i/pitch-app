import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG, FREE_CATALOG, catalogForTier } from '../lib/catalog';
import { generateDailyLesson, type LessonInput } from '../lib/lessonGenerator';
import { buildRecommendations, type RecommendationInput } from '../lib/recommendations';
import { DEFAULT_PREFERENCES } from '../model/preferencesStore';
import { emptySkillState } from '../lib/mastery';
import { ALL_SKILLS, type SkillId, type SkillState } from '../model/types';

function skills(): Record<SkillId, SkillState> {
  return Object.fromEntries(ALL_SKILLS.map((s) => [s, emptySkillState()])) as Record<SkillId, SkillState>;
}

test('the premium catalog is a strict superset of the free one', () => {
  const freeIds = new Set(FREE_CATALOG.map((a) => a.id));
  assert.ok(FREE_CATALOG.length < CATALOG.length, 'premium should add activities');
  for (const a of FREE_CATALOG) assert.equal(a.tier, 'free');
  assert.ok(CATALOG.some((a) => a.tier === 'premium'), 'catalog should contain premium activities');
  for (const id of freeIds) assert.ok(CATALOG.some((a) => a.id === id));
});

test('catalogForTier gates correctly', () => {
  assert.equal(catalogForTier('free').length, FREE_CATALOG.length);
  assert.equal(catalogForTier('premium').length, CATALOG.length);
  assert.ok(catalogForTier('free').every((a) => a.tier === 'free'));
});

const lessonInput = (over: Partial<LessonInput> = {}): LessonInput => ({
  dayKey: '2026-07-20',
  prefs: { ...DEFAULT_PREFERENCES, updatedAt: 0 },
  skills: skills(),
  reviews: {},
  focus: null,
  streak: 1,
  annotations: [],
  tendencies: [],
  minutesPracticedToday: 0,
  ...over,
});

test('a free lesson never contains a premium activity', () => {
  const premiumIds = new Set(CATALOG.filter((a) => a.tier === 'premium').map((a) => a.id));
  // default catalog is FREE_CATALOG
  const lesson = generateDailyLesson(lessonInput());
  for (const step of lesson.steps) assert.ok(!premiumIds.has(step.activity.id));
});

test('a premium lesson may use premium activities', () => {
  const lesson = generateDailyLesson(lessonInput({ catalog: catalogForTier('premium') }));
  assert.ok(lesson.steps.length > 0);
  // (not asserting it *does* use one — need-scoring may still prefer basics —
  // only that it is allowed to, which the pool membership guarantees)
});

const recInput = (over: Partial<RecommendationInput> = {}): RecommendationInput => ({
  skills: skills(),
  reviews: {},
  prefs: { ...DEFAULT_PREFERENCES, updatedAt: 0 },
  focus: null,
  tendencies: [],
  annotations: [],
  now: Date.parse('2026-07-20'),
  ...over,
});

test('free recommendations never point at a locked exercise', () => {
  const premiumIds = new Set(CATALOG.filter((a) => a.tier === 'premium').map((a) => a.id));
  const recs = buildRecommendations(recInput());
  for (const r of recs) assert.ok(!premiumIds.has(r.activity.id));
});
