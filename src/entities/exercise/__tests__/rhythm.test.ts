import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradePhrase, type GradeFrame } from '../evaluation';
import type { TargetNote } from '../types';

const FRAME = 0.03;
/** frames reach the grader this late, like the real detector */
const LAG = 0.05;

/** back-to-back notes, `noteSec` each */
function phrase(midis: number[], noteSec = 0.5): TargetNote[] {
  return midis.map((midi, i) => ({ midi, start: i * noteSec, duration: noteSec }) as TargetNote);
}

/** a singer holding `midi` from `from` to `to` (phrase seconds), stamped with detector lag */
function sing(midi: number, from: number, to: number): GradeFrame[] {
  const out: GradeFrame[] = [];
  for (let t = from; t < to; t += FRAME) out.push({ t: t + LAG, sungMidi: midi });
  return out;
}

const SCALE = [60, 62, 64, 65, 67];

test('notes arriving on the beat score full rhythm', () => {
  const notes = phrase(SCALE);
  const frames = notes.flatMap((n) => sing(n.midi, n.start, n.start + n.duration));
  assert.equal(gradePhrase(notes, frames).rhythm, 100);
});

test('one pitch held through the whole phrase is not on time', () => {
  // the old rule — "voiced during the window" — scored this 100
  const notes = phrase(SCALE);
  const frames = sing(60, 0, 2.5);
  assert.ok(gradePhrase(notes, frames).rhythm <= 20, `rhythm ${gradePhrase(notes, frames).rhythm}`);
});

test('arriving late on every note costs rhythm, more the later', () => {
  const notes = phrase(SCALE);
  const late = (by: number) =>
    gradePhrase(notes, notes.flatMap((n) => sing(n.midi, n.start + by, n.start + n.duration + by))).rhythm;
  assert.equal(late(0.1), 100); // within tolerance
  const quarterLate = late(0.25);
  assert.ok(quarterLate > 0 && quarterLate < 100, `0.25 s late: ${quarterLate}`);
  assert.ok(late(0.35) < quarterLate);
});

test('skipped notes count against rhythm', () => {
  const notes = phrase(SCALE);
  const frames = notes.filter((_, i) => i % 2 === 0).flatMap((n) => sing(n.midi, n.start, n.start + n.duration));
  assert.equal(gradePhrase(notes, frames).rhythm, 60); // 3 of 5
});

test('repeated notes: a legato repeat gets the benefit of the doubt, a re-attack is timed', () => {
  const notes = phrase([64, 64, 64]);
  assert.equal(gradePhrase(notes, sing(64, 0, 1.5)).rhythm, 100);

  // re-attacks 0.3 s late on the 2nd and 3rd notes
  const frames = [...sing(64, 0, 0.7), ...sing(64, 0.8, 1.2), ...sing(64, 1.3, 1.5)];
  assert.ok(gradePhrase(notes, frames).rhythm < 100);
});
