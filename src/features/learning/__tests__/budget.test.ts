import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitLessonToBudget, MAX_LADDER_ROUNDS, maxReps } from '../lib/budget';
import { CATALOG, sessionSeconds } from '../lib/catalog';
import type { DailyLesson } from '../model/types';

function lesson(ids: string[]): DailyLesson {
  const steps = ids.map((id, i) => {
    const activity = CATALOG.find((a) => a.id === id)!;
    return { slot: `step-${i}`, activity, reason: '', estMinutes: activity.minutes };
  });
  return { dayKey: '2026-10-14', focus: null, steps, estMinutes: 0 };
}

const fittedSeconds = (l: DailyLesson) =>
  l.steps.reduce((sum, s) => sum + sessionSeconds(s.activity, s.rounds ?? s.activity.rounds), 0);

test('a melody run is far shorter than the old multi-minute guesses', () => {
  const twinkle = CATALOG.find((a) => a.id === 'twinkle')!;
  assert.ok(twinkle.secondsPerRep >= 20 && twinkle.secondsPerRep <= 45, `${twinkle.secondsPerRep}s`);
});

test('a song runs once; a scale or arpeggio climbs keys, as far as the range allows', () => {
  const byId = (id: string) => CATALOG.find((a) => a.id === id)!;
  assert.equal(maxReps(byId('twinkle')), 1);
  assert.equal(maxReps(byId('c-major-scale')), MAX_LADDER_ROUNDS);
  // an octave scale in a 15-semitone range (13 usable): two keys
  assert.equal(maxReps(byId('c-major-scale'), { lowMidi: 53, highMidi: 68 }), 2);
  const fit = fitLessonToBudget(lesson(['twinkle', 'c-major-scale']), 30, { lowMidi: 53, highMidi: 68 });
  assert.deepEqual(fit.steps.map((s) => s.rounds), [1, 2]);
});

test('a 5-minute day of three exercises reaches its budget', () => {
  const fit = fitLessonToBudget(lesson(['note-echo', 'c-major-scale', 'major-arpeggio']), 5);
  assert.ok(fittedSeconds(fit) >= 5 * 60, `${fittedSeconds(fit)}s`);
  // and overshoots by at most one repetition
  const longestRep = Math.max(...fit.steps.map((s) => s.activity.secondsPerRep));
  assert.ok(fittedSeconds(fit) < 5 * 60 + longestRep);
});

test('repetitions stay between the default and the cap', () => {
  const fit = fitLessonToBudget(lesson(['note-echo', 'twinkle']), 30);
  for (const s of fit.steps) {
    assert.ok(s.rounds! >= s.activity.rounds);
    assert.ok(s.rounds! <= maxReps(s.activity));
  }
  // both capped: the day stays short instead of looping forever
  assert.ok(fit.steps.every((s) => s.rounds === maxReps(s.activity)));
});

test('a day already over budget is left at default repetitions', () => {
  const fit = fitLessonToBudget(lesson(['note-echo', 'twinkle']), 0);
  for (const s of fit.steps) assert.equal(s.rounds, s.activity.rounds);
});

test('time spreads across exercises rather than piling onto one', () => {
  const fit = fitLessonToBudget(lesson(['note-echo', 'c-major-scale', 'major-arpeggio']), 5);
  const secs = fit.steps.map((s) => sessionSeconds(s.activity, s.rounds));
  assert.ok(Math.max(...secs) - Math.min(...secs) <= Math.max(...fit.steps.map((s) => s.activity.secondsPerRep)) + 10);
});
