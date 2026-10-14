import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacitySeconds } from '../lib/budget';
import { CATALOG, catalogForTier, FREE_CATALOG } from '../lib/catalog';
import { mulberry32 } from '../lib/seeded';
import {
  generateDefaultWeeklyPlan,
  MAX_EXERCISES_PER_DAY,
  planHasPremiumActivity,
  planPredatesFreeCatalogExpansion,
  planRepeatsEveryDay,
  weeklyPlanFromSteps,
} from '../lib/weeklyPlan';
import type { WeekdayIndex, WeeklyPlan } from '../model/types';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[];
const ids = (plan: WeeklyPlan, day: WeekdayIndex) => (plan[day] ?? []).map((e) => e.activityId);

test('songs are free', () => {
  for (const id of ['twinkle', 'mary-lamb', 'frere-jacques', 'ode-to-joy']) {
    assert.equal(CATALOG.find((a) => a.id === id)?.tier, 'free', `${id} should be free`);
  }
});

test('ear drills and the scale/arpeggio warm-ups are free, and free plans use them', () => {
  const nowFree = [
    'echo-interval', 'sing-interval', 'finish-melody', 'major-minor', 'odd-one-out',
    'c-major-scale', 'major-arpeggio', 'e-minor-scale', 'minor-arpeggio',
  ];
  for (const id of nowFree) assert.equal(CATALOG.find((a) => a.id === id)?.tier, 'free', `${id} should be free`);
  const used = new Set<string>();
  for (let seed = 0; seed < 5; seed++) {
    const plan = generateDefaultWeeklyPlan(10, 'free', mulberry32(seed));
    for (const day of DAYS) for (const id of ids(plan, day)) used.add(id);
  }
  for (const id of nowFree) assert.ok(used.has(id), `${id} never scheduled in a free plan`);
});

test('every day of the default plan holds enough exercises to fill the budget', () => {
  for (const [minutes, count] of [[5, 3], [10, 5], [15, 7], [20, 8]] as const) {
    for (const tier of ['free', 'premium'] as const) {
      const plan = generateDefaultWeeklyPlan(minutes, tier, mulberry32(1));
      for (const day of DAYS) {
        const activities = (plan[day] ?? []).map((e) => CATALOG.find((a) => a.id === e.activityId)!);
        assert.ok(activities.length >= count, `${tier} ${minutes} min, day ${day}: ${activities.length}`);
        const capacity = activities.reduce((sum, a) => sum + capacitySeconds(a), 0);
        // unless it is already full, or holds the tier's whole catalog
        const full = activities.length === MAX_EXERCISES_PER_DAY || activities.length === catalogForTier(tier).length;
        assert.ok(capacity >= minutes * 60 || full, `${tier} ${minutes} min, day ${day}`);
      }
    }
  }
});

test('no exercise repeats within a day, nor on consecutive days while the pool allows', () => {
  // the free pool (9) fits two consecutive 5-minute days (3 each) without overlap
  for (let seed = 0; seed < 20; seed++) {
    for (const [tier, minutes] of [['free', 5], ['premium', 15]] as const) {
      const plan = generateDefaultWeeklyPlan(minutes, tier, mulberry32(seed));
      for (const day of DAYS) {
        const today = ids(plan, day);
        assert.equal(new Set(today).size, today.length, `duplicate within day ${day}`);
        if (day === 0) continue;
        const yesterday = new Set(ids(plan, (day - 1) as WeekdayIndex));
        assert.ok(!today.some((id) => yesterday.has(id)), `${tier} seed ${seed}: day ${day} repeats day ${day - 1}`);
      }
    }
  }
});

test('a free week covers the whole free catalog', () => {
  // 10 minutes: enough core slots across the week for every free exercise
  const plan = generateDefaultWeeklyPlan(10, 'free', mulberry32(7));
  const used = new Set(DAYS.flatMap((d) => ids(plan, d)));
  for (const a of FREE_CATALOG) assert.ok(used.has(a.id), `${a.id} never scheduled`);
  for (const id of used) assert.ok(FREE_CATALOG.some((a) => a.id === id), `${id} is not free`);
});

test('every premium day includes a premium exercise; free plans none', () => {
  const premium = generateDefaultWeeklyPlan(5, 'premium', mulberry32(3));
  const premiumIds = new Set(CATALOG.filter((a) => a.tier === 'premium').map((a) => a.id));
  for (const day of DAYS) assert.ok(ids(premium, day).some((id) => premiumIds.has(id)), `day ${day}`);
  assert.ok(planHasPremiumActivity(premium));
  assert.ok(!planHasPremiumActivity(generateDefaultWeeklyPlan(15, 'free', mulberry32(3))));
});

test('warm-ups and cool-downs are easy', () => {
  const plan = generateDefaultWeeklyPlan(15, 'premium', mulberry32(11));
  for (const day of DAYS) {
    const entries = plan[day] ?? [];
    for (const entry of [entries[0], entries[entries.length - 1]]) {
      const activity = CATALOG.find((a) => a.id === entry.activityId);
      assert.ok(activity && activity.challenge <= 0.35, `${entry.activityId} on day ${day}`);
    }
  }
});

test('detects the legacy same-list-every-day plan', () => {
  const legacy = weeklyPlanFromSteps([
    { kind: 'ear', activityId: 'note-echo' },
    { kind: 'melody', activityId: 'twinkle' },
  ]);
  assert.ok(planRepeatsEveryDay(legacy));
  assert.ok(!planRepeatsEveryDay(generateDefaultWeeklyPlan(10, 'free', mulberry32(5))));
  assert.ok(!planRepeatsEveryDay({}));
});

test('recognises a free plan built before the free catalog grew', () => {
  const old = weeklyPlanFromSteps([
    { kind: 'ear', activityId: 'note-echo' },
    { kind: 'melody', activityId: 'twinkle' },
  ]);
  assert.ok(planPredatesFreeCatalogExpansion(old));
  // anything newer in it means it was made or edited since
  assert.ok(!planPredatesFreeCatalogExpansion({ ...old, 2: [{ kind: 'ear', activityId: 'sing-interval' }] }));
  assert.ok(!planPredatesFreeCatalogExpansion({}));
  // a freshly generated free plan uses the new exercises, so it's never refreshed again
  assert.ok(!planPredatesFreeCatalogExpansion(generateDefaultWeeklyPlan(5, 'free', mulberry32(2))));
});
