import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LISTENING_ONLY_EXERCISE_IDS, singingAccuracy, weeklyAccuracyTrend, weeklyStats } from '../lib/stats';
import type { SessionRecord } from '../model/progressStore';

const NOW = Date.UTC(2026, 9, 24, 12);
const DAY = 24 * 60 * 60 * 1000;

function session(exerciseId: string, score: number, avgCents: number, at = NOW - DAY): SessionRecord {
  return { exerciseId, exerciseTitle: exerciseId, at, score, stars: 0, avgCents, stability: score, rhythm: score, notes: {} };
}

test('the listening-only ids are exactly the ear drills that need no mic', () => {
  // read as text: the definitions module pulls in React Native, which node can't load
  const source = readFileSync(new URL('../../ear-training/model/definitions.ts', import.meta.url), 'utf8');
  const drills = [...source.matchAll(/^  id: '([^']+)',[\s\S]*?^  needsMic: (true|false),/gm)];
  assert.ok(drills.length >= 9, 'found the drill definitions');
  const expected = drills.filter(([, , needsMic]) => needsMic === 'false').map(([, id]) => `ear:${id}`).sort();
  assert.deepEqual([...LISTENING_ONLY_EXERCISE_IDS].sort(), expected);
});

test('listening drills stay out of singing accuracy', () => {
  const sessions = [session('ear:major-minor', 100, 0), session('ear:note-echo', 60, 20), session('c-major-scale', 80, 10)];
  assert.equal(singingAccuracy(sessions), 70);
  assert.equal(singingAccuracy([session('ear:odd-one-out', 100, 0)]), null);
});

test('weekly accuracy, deviation and trend ignore listening drills', () => {
  const sessions = [
    session('ear:odd-one-out', 100, 0),
    session('c-major-scale', 50, 30),
    session('ear:major-minor', 100, 0, NOW - 8 * DAY),
    session('c-major-scale', 40, 30, NOW - 8 * DAY),
  ];
  const week = weeklyStats(sessions, NOW);
  assert.equal(week.sessions, 2);
  assert.equal(week.sungSessions, 1);
  assert.equal(week.avgScore, 50);
  assert.equal(week.avgCents, 30);
  assert.equal(week.scoreDelta, 10);

  const trend = weeklyAccuracyTrend(sessions, 2, NOW);
  assert.deepEqual(trend.map((p) => p.avgScore), [40, 50]);
});
