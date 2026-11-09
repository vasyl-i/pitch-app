/**
 * Jump-guard tests. The guard exists because speaker playback (and, less
 * often, a singer's own onsets) makes the detector report 1–5 frame readings
 * an octave below or tens of semitones above the voice, which the monitor's
 * line drew as full-height spikes. It must remove those without delaying or
 * altering anything a voice actually does.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPitchJumpGuard } from '../lib/signal';

const FRAME_MS = 11.6;
const LO = 36;
const HI = 83;

/** feeds the pitches one frame apart; returns the midi values shown, in order */
function run(pitches: (number | null)[]) {
  const guard = createPitchJumpGuard(LO, HI);
  const shown: number[] = [];
  pitches.forEach((m, i) => {
    for (const f of guard.push(m, i * FRAME_MS)) shown.push(f.midi);
  });
  return shown;
}

const hold = (midi: number, frames: number) => Array<number>(frames).fill(midi);

test('a held note passes through untouched once established', () => {
  assert.deepEqual(run(hold(60.13, 20)), hold(60.13, 20));
});

test('isolated octave errors and high bursts are dropped', () => {
  const shown = run([...hold(64, 10), 52, 52, ...hold(64, 5), 98, ...hold(64, 5), 45, 45.2, 45.1, ...hold(64, 5)]);
  assert.ok(shown.every((m) => m === 64), `stray frames shown: ${shown.filter((m) => m !== 64)}`);
});

test('a real leap is shown in full, its first frames back-filled', () => {
  const shown = run([...hold(60, 10), ...hold(72, 10)]);
  assert.deepEqual(shown, [...hold(60, 10), ...hold(72, 10)]);
});

test('glides and vibrato are never held back', () => {
  const glide = Array.from({ length: 40 }, (_, i) => 55 + i * 0.3); // 12 semitones in ~0.46s
  const vibrato = Array.from({ length: 60 }, (_, i) => 67 + 0.5 * Math.sin((2 * Math.PI * 6 * i * FRAME_MS) / 1000));
  const input = [...hold(55, 4), ...glide, ...vibrato];
  assert.deepEqual(run(input), input);
});

test('pitches outside the trusted range are never shown', () => {
  assert.deepEqual(run([...hold(30, 10), ...hold(95, 10)]), []);
});

test('a short onset that never settles is not shown, a settled one is', () => {
  assert.deepEqual(run([null, 70, 40, 81, null]), []);
  assert.deepEqual(run([null, ...hold(62, 6)]), hold(62, 6));
});

test('frames carry their data, and the held run is visible until released', () => {
  const guard = createPitchJumpGuard<number>(LO, HI);
  for (let i = 0; i < 5; i++) guard.push(60, i * FRAME_MS, i);
  assert.equal(guard.oldestHeld, null);
  guard.push(72, 5 * FRAME_MS, 5);
  guard.push(72, 6 * FRAME_MS, 6);
  assert.equal((guard.oldestHeld as { data: number } | null)?.data, 5);
  guard.push(72, 7 * FRAME_MS, 7);
  guard.push(72, 8 * FRAME_MS, 8);
  const released = guard.push(72, 9 * FRAME_MS, 9);
  assert.deepEqual(released.map((f) => f.data), [5, 6, 7, 8, 9]);
  assert.equal(guard.oldestHeld, null);
});

test('the default range is the detector\'s trusted band', () => {
  const guard = createPitchJumpGuard();
  const shown = (m: number) => [0, 1, 2, 3, 4, 5].flatMap((i) => guard.push(m, i * FRAME_MS)).length > 0;
  assert.equal(shown(30), false); // below 65Hz
  guard.reset();
  assert.equal(shown(57), true);
  guard.reset();
  assert.equal(shown(90), false); // above 1kHz
});

test('a note from silence is shown after two agreeing frames, nothing lost', () => {
  const guard = createPitchJumpGuard(LO, HI);
  assert.equal(guard.push(62, 0).length, 0);
  assert.deepEqual(guard.push(62.1, FRAME_MS).map((f) => f.midi), [62, 62.1]);
  // a lone blip in silence still never shows
  assert.deepEqual(run([null, null, 70, null, null, null, null]), []);
});

test('a soft note with dropped frames still gets through', () => {
  // the gate/detector loses every other frame of a breathy onset
  const shown = run([null, 60, null, 60.1, null, 60.2, 60.2, null, 60.3]);
  assert.deepEqual(shown, [60, 60.1, 60.2, 60.2, 60.3]);
});

test('a dropout inside an octave stray does not let it through', () => {
  const shown = run([...hold(64, 10), 52, null, 52, 52, ...hold(64, 5)]);
  assert.ok(shown.every((m) => m === 64), `stray frames shown: ${shown.filter((m) => m !== 64)}`);
});

test('a candidate is dropped after too many dropouts', () => {
  assert.deepEqual(run([62, null, null, null, 75]), []);
});
