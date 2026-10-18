import assert from 'node:assert/strict';
import { test } from 'node:test';
import { melodyById } from '../library';
import { keyLadder, keyRoom, ladderRoom, nextSweepKey, randomKey, transposeExercise } from '../transpose';

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

test('an endless scale sweeps to one end of the room, turns, and comes back', () => {
  const room = { lowest: -2, highest: 1 };
  let key = { shift: room.lowest, direction: 1 as 1 | -1 };
  const visited = [key.shift];
  for (let i = 0; i < 8; i++) {
    key = nextSweepKey(key.shift, key.direction, room);
    visited.push(key.shift);
  }
  assert.deepEqual(visited, [-2, -1, 0, 1, 0, -1, -2, -1, 0]);
  // starting from the top, downward
  assert.deepEqual(nextSweepKey(1, -1, room), { shift: 0, direction: -1 });
  // a one-key room just stays put
  assert.deepEqual(nextSweepKey(3, 1, { lowest: 3, highest: 3 }), { shift: 3, direction: 1 });
});

test('a random key stays in the room and never repeats the last one', () => {
  const room = { lowest: -3, highest: 3 };
  let previous: number | null = null;
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const shift = randomKey(room, previous);
    assert.ok(shift >= room.lowest && shift <= room.highest, `${shift}`);
    assert.notEqual(shift, previous);
    seen.add(shift);
    previous = shift;
  }
  assert.equal(seen.size, 7);
  assert.equal(randomKey({ lowest: 2, highest: 2 }, 2), 2);
});

test('the key room keeps every note inside the range', () => {
  const range = { lowMidi: 50, highMidi: 70 }; // usable 51–69
  const room = keyRoom(scale, range);
  assert.deepEqual(room, { lowest: -9, highest: -3 });
  // narrower than the scale: its best-fit key only
  const tight = keyRoom(scale, { lowMidi: 58, highMidi: 66 });
  assert.equal(tight.lowest, tight.highest);
});
