import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateFixedLesson } from '../lib/fixedProgression';
import { FREE_CATALOG } from '../lib/catalog';

const freeIds = new Set(FREE_CATALOG.map((a) => a.id));

test('the fixed lesson only ever uses free activities', () => {
  for (const day of ['2026-01-01', '2026-03-15', '2026-07-20', '2026-12-31']) {
    const lesson = generateFixedLesson({ dayKey: day });
    assert.ok(lesson.steps.length > 0);
    for (const step of lesson.steps) {
      assert.ok(freeIds.has(step.activity.id), `${step.activity.id} is not a free activity`);
    }
  }
});

test('is deterministic for a given day', () => {
  const a = generateFixedLesson({ dayKey: '2026-07-20' });
  const b = generateFixedLesson({ dayKey: '2026-07-20' });
  assert.deepEqual(
    a.steps.map((s) => s.activity.id),
    b.steps.map((s) => s.activity.id)
  );
});

test('varies across days', () => {
  const days = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'];
  const shapes = new Set(days.map((d) => generateFixedLesson({ dayKey: d }).steps.map((s) => s.activity.id).join('|')));
  assert.ok(shapes.size > 1, 'the fixed plan should not be identical every day');
});

test('trims to the daily time budget', () => {
  const short = generateFixedLesson({ dayKey: '2026-07-20', dailyMinutes: 5 });
  const full = generateFixedLesson({ dayKey: '2026-07-20', dailyMinutes: 30 });
  assert.ok(short.steps.length <= full.steps.length);
  assert.ok(short.steps.length >= 1);
});

test('starts with a warm-up and never repeats an activity', () => {
  const lesson = generateFixedLesson({ dayKey: '2026-07-20', dailyMinutes: 30 });
  assert.equal(lesson.steps[0].slot, 'warmup');
  const ids = lesson.steps.map((s) => s.activity.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('has no personalised focus', () => {
  assert.equal(generateFixedLesson({ dayKey: '2026-07-20' }).focus, null);
});
