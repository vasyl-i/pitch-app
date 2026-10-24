import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyTotals, isoDay, mergeHistories, recordInHistory, rollupSessions, shiftDay } from '../lib/history';
import { bucketSeries, rangeTotal } from '../lib/series';
import type { SessionRecord } from '../model/progressStore';

const NOW = new Date(2026, 9, 24, 12).getTime();
const DAY = 24 * 60 * 60 * 1000;

function session(at: number, durationSec = 60, perfect = 2, count = 5): SessionRecord {
  return {
    exerciseId: 'c-major-scale', exerciseTitle: 'C major', at, score: 80, stars: 2, avgCents: 10, stability: 80, rhythm: 80,
    durationSec, notes: { 0: { centsSum: 0, count, perfect } },
  };
}

test('days are local calendar days, zero-padded and sortable', () => {
  assert.equal(isoDay(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05');
  assert.equal(shiftDay(NOW, -6), '2026-10-18');
});

test('a day row counts sessions, time and perfect notes', () => {
  const history = rollupSessions([session(NOW), session(NOW - 3600_000, 30, 1, 4), session(NOW - 2 * DAY)]);
  assert.deepEqual(history['2026-10-24'], { day: '2026-10-24', sessions: 2, practiceSec: 90, perfectNotes: 3, gradedNotes: 9 });
  assert.deepEqual(historyTotals(history), { daysPracticed: 2, practiceSec: 150, perfectNotes: 5 });
});

test('merging keeps the fuller copy of each day', () => {
  const full = recordInHistory(recordInHistory({}, session(NOW)), session(NOW - 60_000));
  const trimmed = rollupSessions([session(NOW)]);
  const other = rollupSessions([session(NOW - 5 * DAY)]);
  const merged = mergeHistories(full, { ...trimmed, ...other });
  assert.equal(merged['2026-10-24'].sessions, 2, 'a recount cut short by the session cap never wins');
  assert.equal(merged['2026-10-19'].sessions, 1, 'days only the other copy has are added');
});

test('buckets end today and sum each window', () => {
  const history = rollupSessions([session(NOW), session(NOW - 6 * DAY), session(NOW - 7 * DAY), session(NOW - 40 * DAY)]);
  const buckets = bucketSeries(history, '4w', (r) => r.sessions, NOW);
  assert.deepEqual(buckets.map((b) => b.value), [0, 0, 1, 2]);
  assert.equal(buckets[3].start, '2026-10-18');
  assert.equal(rangeTotal(history, '4w', (r) => r.sessions, NOW), 3);
});
