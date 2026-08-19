import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNoteAggregator, noteClass, scoreNotes, type SungNote } from '../lib/notes';
import { gradePitch, keyPitchClasses } from '../lib/grade';

/** feed a steady pitch for `sec` at ~83Hz frame spacing, starting at t0 */
function sing(agg: ReturnType<typeof createNoteAggregator>, t0: number, sec: number, midi: number, cents: number) {
  const out: SungNote[] = [];
  for (let t = t0; t <= t0 + sec; t += 0.012) {
    const done = agg.push(t, midi, cents);
    if (done) out.push(done);
  }
  return out;
}

test('a blip shorter than the sustain requirement never becomes a note', () => {
  const agg = createNoteAggregator();
  sing(agg, 0, 0.05, 60, 0);
  const done = agg.silence(1);
  assert.equal(done, null);
  assert.equal(agg.flush(), null);
});

test('a sustained pitch commits one note with its lane and class', () => {
  const agg = createNoteAggregator();
  // 10 cents sharp of C4: lane snaps to 60, class near-perfect
  sing(agg, 0, 0.5, 60.1, 10);
  const done = agg.flush();
  assert.ok(done);
  assert.equal(done.laneMidi, 60);
  assert.equal(done.medianCents, 10);
  assert.equal(done.cls, 'perfect');
});

test('a pitch jump closes the old note and starts a new one', () => {
  const agg = createNoteAggregator();
  const committed = [...sing(agg, 0, 0.4, 60, 0), ...sing(agg, 0.42, 0.4, 64, 0)];
  const last = agg.flush();
  assert.equal(committed.length, 1);
  assert.equal(committed[0].laneMidi, 60);
  assert.ok(last);
  assert.equal(last.laneMidi, 64);
});

test('silence beyond the gap closes the forming note', () => {
  const agg = createNoteAggregator();
  sing(agg, 0, 0.3, 62, -20);
  const done = agg.silence(0.6);
  assert.ok(done);
  assert.equal(done.laneMidi, 62);
});

test('note classes follow the lime/white/red bands', () => {
  assert.equal(noteClass(0), 'perfect');
  assert.equal(noteClass(-25), 'perfect');
  assert.equal(noteClass(40), 'good');
  assert.equal(noteClass(-70), 'good');
  assert.equal(noteClass(90), 'off');
});

test('the take score is duration-weighted and null without notes', () => {
  assert.equal(scoreNotes([]), null);
  const notes: SungNote[] = [
    { t0: 0, t1: 2, laneMidi: 60, medianCents: 0, cls: 'perfect' },
    { t0: 2, t1: 2.5, laneMidi: 61, medianCents: 90, cls: 'off' },
  ];
  const score = scoreNotes(notes);
  assert.ok(score);
  // 2s of 2.5s in key
  assert.equal(Math.round(score.inKeyFraction * 100), 80);
  assert.equal(score.notes, 2);
  assert.ok(score.score > 50 && score.score < 100);
});

test('minor-key scales grade their own notes as in key', () => {
  const cMinor = keyPitchClasses('C minor');
  assert.deepEqual(cMinor, [0, 2, 3, 5, 7, 8, 10]);
  // E♭4 (midi 63) is in C minor: dead on
  assert.equal(gradePitch(63, { keyName: 'C minor', chords: [] }).cents, 0);
  // E♮4 (midi 64) is a semitone off the nearest scale tone
  assert.equal(Math.abs(gradePitch(64, { keyName: 'C minor', chords: [] }).cents), 100);
});
