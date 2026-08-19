import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAttemptRecord, buildSessionRecord, tallyByInterval, tallyByMidi } from '../lib/record';
import type { GradedNote } from '../lib/record';
import type { Exercise } from '@/entities/exercise';

const n = (midi: number, cents: number, perfect = false): GradedNote => ({ midi, medianCents: cents, perfect });

test('tallyByMidi accumulates per exact note', () => {
  const t = tallyByMidi([[n(67, 30), n(67, 20)], [n(60, -5, true)]]);
  assert.equal(t[67].count, 2);
  assert.equal(t[67].centsSum, 50);
  assert.equal(t[60].perfect, 1);
});

test('tallyByInterval keys on signed semitones and credits the landing note', () => {
  // C4→E4 (+4), E4→C4 (-4)
  const t = tallyByInterval([[n(60, 0), n(64, 25), n(60, -10)]]);
  assert.equal(t['+4'].count, 1);
  assert.equal(t['+4'].centsSum, 25);
  assert.equal(t['-4'].count, 1);
  assert.equal(t['-4'].centsSum, -10);
});

test('a repeated note forms no interval', () => {
  const t = tallyByInterval([[n(60, 0), n(60, 5), n(62, 10)]]);
  assert.equal(t['0'], undefined);
  assert.equal(t['+2'].count, 1);
});

test('intervals never chain across sequence boundaries', () => {
  // two separate phrases; the C5→C4 leap between them must not appear
  const t = tallyByInterval([[n(72, 0), n(74, 0)], [n(60, 0), n(62, 0)]]);
  assert.equal(t['+2'].count, 2);
  assert.equal(t['-12'], undefined);
});

test('buildAttemptRecord omits weak-spot buckets without melodic sequences', () => {
  const rec = buildAttemptRecord({ id: 'x', title: 'X' }, { score: 80, avgCents: 5, stability: 80, rhythm: 80 }, [
    n(67, 10),
  ]);
  assert.equal(rec.notesByMidi, undefined);
  assert.equal(rec.intervals, undefined);
  assert.ok(rec.notes[7], 'pitch-class tally is always kept');
});

// a missed middle note must break the interval chain, not join its neighbours
const exercise: Exercise = {
  id: 'test',
  title: 'Test',
  source: 'test',
  key: 'C major',
  bpm: 100,
  category: 'warmup',
  difficulty: 'easy',
  notes: [
    { midi: 60, start: 0, duration: 0.5 },
    { midi: 64, start: 0.5, duration: 0.5 },
    { midi: 67, start: 1, duration: 0.5 },
    { midi: 72, start: 1.5, duration: 0.5 },
  ],
};

test('a missed note breaks the interval run rather than inventing a leap', () => {
  const summary = {
    score: 70,
    avgCents: 8,
    stability: 75,
    rhythm: 80,
    results: [
      { noteIndex: 0, verdict: 'perfect', medianCents: 2 },
      { noteIndex: 1, verdict: 'good', medianCents: 12 },
      { noteIndex: 2, verdict: 'missed', medianCents: 0 }, // G4 skipped
      { noteIndex: 3, verdict: 'good', medianCents: -8 },
    ],
  };
  const rec = buildSessionRecord(exercise, summary, 0);
  assert.ok(rec.intervals, 'a melody should produce interval data');
  // C4→E4 is real (+4); E4→C5 would be +8 and must NOT exist
  assert.equal(rec.intervals!['+4'].count, 1);
  assert.equal(rec.intervals!['+8'], undefined);
  assert.equal(rec.intervals!['+5'], undefined); // G4→C5 also absent — G4 was missed
  // the missed G4 leaves no per-midi tally either
  assert.equal(rec.notesByMidi![67], undefined);
});
