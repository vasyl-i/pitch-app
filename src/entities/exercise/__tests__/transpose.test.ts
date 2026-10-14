import assert from 'node:assert/strict';
import { test } from 'node:test';
import { melodyById } from '../library';
import { keyLadder, ladderRoom, transposeExercise } from '../transpose';

const scale = melodyById('c-major-scale')!; // C4–C5, an octave

test('a key ladder climbs a semitone per round, inside the range', () => {
  const range = { lowMidi: 50, highMidi: 70 }; // usable 51–69
  const ladder = keyLadder(scale, range, 4);
  assert.deepEqual(ladder.map((s, i) => s - ladder[0]), [0, 1, 2, 3]);
  for (const shift of ladder) {
    const midis = transposeExercise(scale, shift).notes.map((n) => n.midi);
    assert.ok(Math.min(...midis) >= 51 && Math.max(...midis) <= 69, `shift ${shift}`);
  }
  // centred in the room the range leaves (shifts -9…-3 fit; four of them sit in the middle)
  assert.deepEqual(ladder, [-8, -7, -6, -5]);
});

test('the ladder is cut short when the range has no room to climb', () => {
  const tight = { lowMidi: 53, highMidi: 68 }; // usable 54–67: room for two keys
  assert.equal(ladderRoom(scale, tight), 2);
  assert.deepEqual(keyLadder(scale, tight, 4), [-6, -5]);
  // narrower than the scale: one round in the best-fit key
  assert.deepEqual(keyLadder(scale, { lowMidi: 58, highMidi: 66 }, 4).length, 1);
});

test('without a range the ladder climbs from the authored key', () => {
  assert.deepEqual(keyLadder(scale, null, 3), [0, 1, 2]);
});

test('each key keeps the tonality', () => {
  assert.equal(transposeExercise(scale, 2).key, 'D major');
  assert.equal(transposeExercise(melodyById('e-minor-scale')!, 1).key, 'F minor');
});
