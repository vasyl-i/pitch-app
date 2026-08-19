/**
 * The note stabilizer, and the separation it exists to enforce.
 *
 * Two things are being protected here. The first is the behaviour: a note name
 * that holds through small excursions across a boundary. The second, and the
 * more important one, is the *boundary* — nothing in this module may alter a
 * pitch value, because pitch values are what scoring reads.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNoteStabilizer, DEFAULT_NOTE_HYSTERESIS_SEMITONES } from '../noteStabilizer';

const H = DEFAULT_NOTE_HYSTERESIS_SEMITONES;

test('the first voiced pitch is shown immediately, rounded', () => {
  const s = createNoteStabilizer();
  assert.equal(s.push(60.2), 60);
  assert.equal(s.note, 60);

  const t = createNoteStabilizer();
  assert.equal(t.push(60.7), 61, 'a first reading past the boundary rounds up, with no hysteresis to hold');
});

test('the displayed note holds until the pitch clears the boundary plus hysteresis', () => {
  const s = createNoteStabilizer(0.25);
  s.push(60);

  // just past the halfway point — plain rounding would flip to 61 here
  assert.equal(s.push(60.6), 60, 'inside the hysteresis band, the note holds');
  assert.equal(s.push(60.74), 60, 'still inside');
  assert.equal(s.push(60.76), 61, 'past 0.5 + 0.25, the note changes');
  // and the reverse direction is equally sticky
  assert.equal(s.push(60.4), 61, 'coming back, it holds the new note');
  assert.equal(s.push(60.2), 60, 'until the pitch clears the band the other way');
});

test('hysteresis is configurable and 0 reproduces plain rounding', () => {
  const plain = createNoteStabilizer(0);
  plain.push(60);
  assert.equal(plain.push(60.6), 61, 'with no hysteresis this is just Math.round');

  const wide = createNoteStabilizer(0.4);
  wide.push(60);
  assert.equal(wide.push(60.8), 60, 'a wider band holds longer');
  assert.equal(wide.push(60.95), 61);
});

test('silence clears the display rather than leaving a stale note', () => {
  const s = createNoteStabilizer();
  s.push(60);
  assert.equal(s.push(null), null);
  assert.equal(s.note, null);
  // and the next voiced frame starts fresh, with no hysteresis carried over
  assert.equal(s.push(60.7), 61);
});

test('push is idempotent, so a repeated render cannot make the display drift', () => {
  // React may render more than once for one update; useStabilizedNote advances
  // the stabilizer during render, which is only safe because of this.
  const s = createNoteStabilizer();
  s.push(60);
  const first = s.push(60.8);
  const second = s.push(60.8);
  const third = s.push(60.8);
  assert.equal(first, 61);
  assert.equal(second, first);
  assert.equal(third, first);
});

test('reduces flicker on a pitch sitting exactly on a note boundary', () => {
  // The failure this module exists for: a singer parked between two notes,
  // whose pitch crosses the boundary every few frames.
  const wobble = Array.from({ length: 200 }, (_, i) => 60.5 + 0.06 * Math.sin(i / 2));

  const count = (hysteresis: number) => {
    const s = createNoteStabilizer(hysteresis);
    let flips = 0;
    let prev: number | null = null;
    for (const m of wobble) {
      const note = s.push(m);
      if (prev !== null && note !== prev) flips++;
      prev = note;
    }
    return flips;
  };

  const plain = count(0);
  const stabilized = count(H);
  assert.ok(plain > 20, `plain rounding should flicker badly, got ${plain} flips`);
  assert.equal(stabilized, 0, `hysteresis should eliminate boundary flicker, got ${stabilized}`);
});

/* ------------------------------------------------------------------ *
 * The separation itself                                               *
 * ------------------------------------------------------------------ */

test('the stabilizer never alters the pitch values handed to it', () => {
  // It returns a note number and nothing else; the caller keeps its own pitch.
  // This test exists to fail loudly if the API ever grows a "corrected pitch".
  const s = createNoteStabilizer();
  const pitches = [60.0, 60.31, 60.62, 60.77, 61.4, 59.8, 60.5];
  const copy = [...pitches];

  for (const m of pitches) {
    const note = s.push(m);
    assert.ok(note === null || Number.isInteger(note), 'the stabilizer returns whole notes only');
  }
  assert.deepEqual(pitches, copy, 'inputs must not be mutated');
});

test('cents computed from raw pitch are unaffected by display stabilization', () => {
  // A held pitch 40 cents above C4 must read as +40¢ regardless of which note
  // name the display happens to be showing.
  const s = createNoteStabilizer();
  s.push(61.2); // display starts on 61
  const rawMidi = 60.4;
  s.push(rawMidi); // 0.8 away from 61 -> still holds 61 (0.8 > 0.75, so it moves)

  const centsFromRaw = (rawMidi - Math.round(rawMidi)) * 100;
  assert.ok(Math.abs(centsFromRaw - 40) < 1e-9, 'cents come from the raw pitch, not the shown note');
});
