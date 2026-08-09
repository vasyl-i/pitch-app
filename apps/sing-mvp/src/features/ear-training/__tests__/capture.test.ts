/**
 * The scoring path reads raw detector pitch.
 *
 * `createSingCapture` is the join between the microphone and ear-training's
 * evaluators, and its frame log is what every score is computed from. A pitch
 * smoother used to sit inside it, so the score depended on a filter whose only
 * purpose was visual calm. These tests pin the separation: the log is raw, the
 * live *name* is stabilized, and the two never cross.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSingCapture, segmentNotes } from '../lib/capture';
import { freqToMidi, midiToName } from '@/shared/lib/music';
import type { PitchFrame } from '@/features/pitch-detection';

const frame = (frequency: number | null, rms = 0.2): PitchFrame => ({
  frequency,
  rms,
  clarity: 0.99,
  clipped: false,
  when: 0,
});

/** the voice gate needs a quiet room to learn before it will accept anything */
function warmUp(capture: ReturnType<typeof createSingCapture>) {
  for (let i = 0; i < 40; i++) capture.push(frame(null, 0.0005));
}

test('the frame log holds raw detector pitch, unfiltered', () => {
  const capture = createSingCapture();
  warmUp(capture);
  capture.begin();

  // a deliberately jittery sequence: a smoother would visibly flatten it
  const hz = [440, 448, 437, 452, 435, 447];
  for (const f of hz) capture.push(frame(f));

  const logged = capture.frames.map((f) => f.midi);
  assert.equal(logged.length, hz.length, 'every voiced frame is logged');
  for (let i = 0; i < hz.length; i++) {
    assert.ok(
      Math.abs(logged[i] - freqToMidi(hz[i])) < 1e-9,
      `frame ${i} must be the raw detector value: got ${logged[i]}, expected ${freqToMidi(hz[i])}`
    );
  }
});

test('a single-frame outlier reaches the log unmodified', () => {
  // The old median-of-3 would have removed this. Scoring is entitled to see it:
  // robustness belongs in the scorer's aggregate, not in a pre-filter.
  const capture = createSingCapture();
  warmUp(capture);
  capture.begin();

  capture.push(frame(440));
  capture.push(frame(440));
  capture.push(frame(880)); // an octave blip
  capture.push(frame(440));

  const logged = capture.frames.map((f) => f.midi);
  assert.equal(logged.length, 4);
  assert.ok(Math.abs(logged[2] - freqToMidi(880)) < 1e-9, 'the outlier is preserved, not smoothed away');
});

test('the live note name is stabilized while live.midi stays raw', () => {
  const capture = createSingCapture();
  warmUp(capture);
  capture.begin();

  // settle on A4 (69), then drift just past the boundary toward A#4
  capture.push(frame(440));
  const boundaryHz = 440 * Math.pow(2, 0.6 / 12); // 69.6 in MIDI
  capture.push(frame(boundaryHz));

  const rawMidi = freqToMidi(boundaryHz);
  assert.ok(Math.abs(capture.live.midi! - rawMidi) < 1e-9, 'live.midi is the raw pitch');
  assert.equal(capture.live.note, midiToName(69), 'the displayed name holds on A4 inside the hysteresis band');

  // push clearly past it and the name follows
  capture.push(frame(440 * Math.pow(2, 0.9 / 12)));
  assert.equal(capture.live.note, midiToName(70));
});

test('segmentation reports the raw sung pitch, not a display value', () => {
  // segmentNotes consumes the frame log, so whatever the log holds is what
  // every multi-note evaluator scores. Built explicitly here because
  // `capture.push` timestamps from the wall clock, which does not advance
  // inside a tight loop.
  const log = Array.from({ length: 30 }, (_, i) => ({
    t: i * 0.0116,
    midi: 69 + 0.18 * Math.sin(i), // a real voice wobbling around A4
  }));

  const notes = segmentNotes(log);
  assert.equal(notes.length, 1, 'a wobbling sustained tone is one note, not several');

  // the segment's pitch is the median of the raw values it was given
  const expected = [...log.map((f) => f.midi)].sort((a, b) => a - b)[Math.floor(log.length / 2)];
  assert.ok(Math.abs(notes[0].midi - expected) < 1e-9, 'the segment pitch is the raw median, unrounded');
  assert.ok(!Number.isInteger(notes[0].midi), 'scoring keeps continuous pitch — it is not quantized to a note');
});

test('silence clears the live readout without touching the log', () => {
  const capture = createSingCapture();
  warmUp(capture);
  capture.begin();

  capture.push(frame(440));
  const loggedBefore = capture.frames.length;
  capture.push(frame(null));

  assert.equal(capture.live.note, null);
  assert.equal(capture.live.midi, null);
  assert.equal(capture.frames.length, loggedBefore, 'an unvoiced frame adds nothing to the log');
});
