import assert from 'node:assert/strict';
import { test } from 'node:test';
import { masteryAsOf, masteryHistoryFromAnnotations, masterySeries, recordMasteryDay } from '../lib/masteryHistory';
import type { SessionAnnotation } from '../model/types';
import { makeSkills } from './helpers';

const day = (d: number, h = 12) => new Date(2026, 9, d, h).getTime();

function annotation(at: number, delta: number): SessionAnnotation {
  return { sessionAt: at, exerciseId: 'x', skills: { 'pitch-accuracy': { value: 80, delta } }, mistakes: [], weeklyFocus: null };
}

test('a day closes on the mastery of every skill trained so far', () => {
  const skills = makeSkills({ 'pitch-accuracy': { mastery: 52, exercisesCompleted: 3 } });
  assert.deepEqual(recordMasteryDay({}, skills, day(24)), { '2026-10-24': { 'pitch-accuracy': 52 } });
});

test('the backfill walks today’s mastery back through each day’s changes', () => {
  const skills = makeSkills({ 'pitch-accuracy': { slow: 50, mastery: 50, exercisesCompleted: 3 } });
  const history = masteryHistoryFromAnnotations(skills, [annotation(day(24), 6), annotation(day(24, 9), 4), annotation(day(20), 10)]);
  assert.deepEqual(history, { '2026-10-24': { 'pitch-accuracy': 50 }, '2026-10-20': { 'pitch-accuracy': 40 } });
});

test('as-of reads the latest close on or before the day, else the starting 30', () => {
  const history = { '2026-10-20': { 'pitch-accuracy': 40 }, '2026-10-24': { 'pitch-accuracy': 50 } };
  assert.deepEqual(masteryAsOf(history, '2026-10-22', ['pitch-accuracy', 'rhythm-accuracy']), {
    'pitch-accuracy': 40,
    'rhythm-accuracy': 30,
  });
});

test('a series opens where the skill stood, and starts from 30 when first trained inside the range', () => {
  const history = { '2026-09-01': { 'pitch-accuracy': 35 }, '2026-10-20': { 'pitch-accuracy': 40 } };
  assert.deepEqual(masterySeries(history, 'pitch-accuracy', '2026-10-01', '2026-10-24').map((p) => p.value), [35, 40, 40]);
  assert.deepEqual(masterySeries(history, 'pitch-accuracy', '2026-10-10', '2026-10-24')[0], { day: '2026-10-10', value: 35 });
  assert.deepEqual(masterySeries({ '2026-10-20': { 'pitch-accuracy': 40 } }, 'pitch-accuracy', '2026-10-01', '2026-10-24'), [
    { day: '2026-10-20', value: 30 },
    { day: '2026-10-20', value: 40 },
    { day: '2026-10-24', value: 40 },
  ]);
});
