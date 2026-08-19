import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRecommendations, type RecommendationInput } from '../lib/recommendations';
import { DEFAULT_PREFERENCES } from '../model/preferencesStore';
import { makeSkills, trained } from './helpers';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

function input(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    skills: makeSkills(),
    reviews: {},
    prefs: { ...DEFAULT_PREFERENCES, updatedAt: 0 },
    focus: null,
    tendencies: [],
    annotations: [],
    now: T0,
    ...overrides,
  };
}

test('every recommendation carries an explanation', () => {
  const recs = buildRecommendations(input());
  assert.ok(recs.length > 0);
  for (const r of recs) {
    assert.ok(r.reason.length > 10, `${r.id} must explain itself`);
    assert.ok(r.activity, `${r.id} must point at something to practice`);
  }
});

test('a consistent flat tendency produces a targeted, explained recommendation', () => {
  const recs = buildRecommendations(
    input({ tendencies: [{ name: 'E', avgCents: -28, count: 9 }] })
  );
  const tendency = recs.find((r) => r.ruleId === 'tendency');
  assert.ok(tendency, 'tendency rule should fire');
  assert.match(tendency!.reason, /E.*flat/s, 'reason names the note and the direction');
});

test('due reviews outrank everything else', () => {
  const recs = buildRecommendations(
    input({
      skills: makeSkills({ 'pitch-memory': { ...trained(45, 5) } }),
      reviews: { 'pitch-memory': { intervalIndex: 2, nextDueAt: T0 - 2 * DAY, lastPracticedAt: T0 - 9 * DAY } },
      tendencies: [{ name: 'A', avgCents: 30, count: 10 }],
    })
  );
  assert.equal(recs[0].ruleId, 'due-review');
  assert.match(recs[0].reason, /overdue/);
});

test('a strong skill earns a level-up recommendation at a harder tier', () => {
  const recs = buildRecommendations(
    input({
      skills: makeSkills({ 'interval-singing': { ...trained(90, 30) } }),
      prefs: null,
    }),
    6
  );
  const levelUp = recs.find((r) => r.ruleId === 'level-up');
  assert.ok(levelUp, 'level-up rule should fire for a mastered skill');
  assert.match(levelUp!.reason, /strong/);
});

test('recommendations are deterministic', () => {
  const a = buildRecommendations(input({ tendencies: [{ name: 'G', avgCents: 25, count: 6 }] }));
  const b = buildRecommendations(input({ tendencies: [{ name: 'G', avgCents: 25, count: 6 }] }));
  assert.deepEqual(a, b);
});
