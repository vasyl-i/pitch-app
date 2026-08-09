import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyObservation,
  BASELINE_MASTERY,
  currentConfidence,
  emptySkillState,
  masteryBand,
} from '../lib/mastery';
import { trained } from './helpers';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

test('one great lesson cannot produce high mastery', () => {
  const after = applyObservation(emptySkillState(), 100, 1, 120, T0);
  assert.ok(after.mastery < 60, `mastery ${after.mastery} should stay far below the observed 100`);
  assert.ok(after.mastery > BASELINE_MASTERY, 'but it should move up from the prior');
});

test('sustained performance converges toward the observed level', () => {
  const state = trained(90, 25);
  assert.ok(state.mastery > 75, `25 sessions at 90 should push mastery high, got ${state.mastery}`);
  assert.ok(state.mastery <= 90, 'mastery never overshoots the evidence');
});

test('mastery is stable against a single bad day once well-evidenced', () => {
  const solid = trained(85, 30);
  const afterBadDay = applyObservation(solid, 20, 1, 120, T0 + 31 * DAY);
  assert.ok(solid.mastery - afterBadDay.mastery < 10, 'one bad session must not crater long-term mastery');
});

test('trend detects improvement and decline', () => {
  let state = trained(50, 10);
  for (let i = 0; i < 3; i++) state = applyObservation(state, 90, 1, 120, T0 + (11 + i) * DAY);
  assert.equal(state.trend, 'improving');

  let falling = trained(80, 10);
  for (let i = 0; i < 3; i++) falling = applyObservation(falling, 40, 1, 120, T0 + (11 + i) * DAY);
  assert.equal(falling.trend, 'declining');
});

test('confidence grows with evidence and decays with inactivity', () => {
  const fresh = trained(70, 2);
  const seasoned = trained(70, 20);
  assert.ok(seasoned.confidence > fresh.confidence);

  const now = seasoned.lastUpdated! + 90 * DAY;
  assert.ok(currentConfidence(seasoned, now) < seasoned.confidence, 'a 90-day break lowers certainty');
});

test('mastery bands cover the five progression states', () => {
  assert.equal(masteryBand(emptySkillState()), 'not-started');
  assert.equal(masteryBand(trained(30, 3)), 'learning');
  assert.equal(masteryBand(trained(55, 10)), 'practicing');
  assert.equal(masteryBand(trained(75, 15)), 'confident');
  assert.equal(masteryBand(trained(95, 40)), 'mastered');
});

test('mastery updates are deterministic', () => {
  assert.deepEqual(trained(72, 12), trained(72, 12));
});
