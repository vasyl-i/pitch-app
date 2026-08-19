/**
 * Voice-gate regression tests.
 *
 * These exist because of a real, shipped bug: the gate learned its noise
 * floor from *every* frame, including the singer's own voice. Sustained
 * singing therefore filled the 20s history with itself, the 10th-percentile
 * "floor" rose to the quiet end of that voice, and the enter threshold
 * (floor x 1.7) climbed above the level being sung — so the gate shut on the
 * singer. Legato and vibrato phrases lost *every* note. Short exercises never
 * filled the window, which is why it only appeared on long backing-track
 * takes.
 *
 * The cases below are the shapes of singing that broke it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVoiceGate } from '../lib/signal';

/** the engine's real cadence — the history length is expressed in frames */
const FRAME_MS = 11.6;
/** a comfortable singing level; the room in these tests is far quieter */
const SINGING_RMS = 0.28;
const ROOM_RMS = 0.004;

interface Feed {
  rms: number;
  midi: number | null;
  frames: number;
}

/** Run frames through a gate, confirming accepted ones as a real caller does. */
function feed(gate: ReturnType<typeof createVoiceGate>, steps: Feed[], startMs = 0) {
  let now = startMs;
  let accepted = 0;
  let total = 0;
  for (const step of steps) {
    for (let i = 0; i < step.frames; i++) {
      const ok = gate.accept(step.rms, step.midi, now);
      if (ok && step.midi !== null) gate.confirm(step.midi, now);
      if (ok) accepted++;
      total++;
      now += FRAME_MS;
    }
  }
  return { accepted, total, now };
}

test('stays open through sustained singing longer than its own history window', () => {
  const gate = createVoiceGate();
  // 2s of quiet room first, so a floor is genuinely learned
  feed(gate, [{ rms: ROOM_RMS, midi: null, frames: 170 }]);

  // then 30s of continuous singing — longer than the 20s RMS history, which
  // is precisely the condition that used to shut the gate
  const sung = feed(gate, [{ rms: SINGING_RMS, midi: 60, frames: 2600 }], 2000);
  assert.equal(sung.accepted, sung.total, `gate closed on ${sung.total - sung.accepted} of ${sung.total} sung frames`);
});

test('a legato phrase survives the unvoiced frames at its note transitions', () => {
  // The detector finds no pitch for a frame or two at each transition. Those
  // frames are loud — they are the singer mid-phrase, not the room — and
  // letting them into the floor estimate was enough to shut the gate for the
  // rest of the phrase.
  const gate = createVoiceGate();
  const phrase: Feed[] = [];
  for (let note = 0; note < 12; note++) {
    phrase.push({ rms: SINGING_RMS, midi: 60 + (note % 5), frames: 26 }); // ~300ms
    phrase.push({ rms: SINGING_RMS, midi: null, frames: 2 }); // transition, still loud
  }

  const r = feed(gate, phrase);
  const voicedFrames = 12 * 26;
  // every genuinely voiced frame must be accepted; the null-pitch ones cannot be
  assert.ok(r.accepted >= voicedFrames, `only ${r.accepted} of ${voicedFrames} voiced frames accepted`);
});

test('vibrato does not shut the gate', () => {
  const gate = createVoiceGate();
  feed(gate, [{ rms: ROOM_RMS, midi: null, frames: 170 }]);

  // 10s of one note with vibrato: pitch oscillates, level dips slightly
  const steps: Feed[] = [];
  for (let i = 0; i < 860; i++) {
    const phase = Math.sin((i / 86) * 2 * Math.PI * 5.5);
    steps.push({ rms: SINGING_RMS * (1 + 0.1 * phase), midi: 69 + 0.4 * phase, frames: 1 });
  }
  const r = feed(gate, steps, 2000);
  assert.equal(r.accepted, r.total, `vibrato lost ${r.total - r.accepted} frames`);
});

test('still rejects a quiet room, and still learns a loud one', () => {
  const quiet = createVoiceGate();
  const r1 = feed(quiet, [{ rms: ROOM_RMS, midi: 60, frames: 300 }]);
  assert.equal(r1.accepted, 0, 'room tone at the absolute minimum must not read as singing');

  // a genuinely noisy room: hum well above the absolute floor, with a pitch
  const noisy = createVoiceGate();
  feed(noisy, [{ rms: 0.05, midi: 45, frames: 400 }]);
  // singing must still clear it...
  const loud = feed(noisy, [{ rms: 0.4, midi: 62, frames: 50 }], 5000);
  assert.equal(loud.accepted, loud.total, 'singing must beat a learned noisy floor');
});

test('the floor is not set by one unrepresentative frame', () => {
  // a single loud non-voiced frame at the very start must not raise the bar
  const gate = createVoiceGate();
  feed(gate, [{ rms: 0.9, midi: null, frames: 1 }]);
  const r = feed(gate, [{ rms: SINGING_RMS, midi: 60, frames: 50 }], 100);
  assert.equal(r.accepted, r.total, 'one stray loud frame closed the gate');
});

test('sustain hysteresis still holds a decaying note', () => {
  const gate = createVoiceGate();
  feed(gate, [{ rms: 0.05, midi: null, frames: 300 }]); // learn a floor of ~0.05

  // attack clears the enter threshold, then the note decays below it but
  // stays above the sustain threshold while the pitch holds
  const attack = feed(gate, [{ rms: 0.2, midi: 60, frames: 10 }], 4000);
  assert.equal(attack.accepted, attack.total);

  const decay = feed(gate, [{ rms: 0.07, midi: 60, frames: 10 }], attack.now);
  assert.equal(decay.accepted, decay.total, 'a decaying sustained note must not flicker off');
});

test('reset clears the learned floor', () => {
  const gate = createVoiceGate();
  feed(gate, [{ rms: 0.05, midi: null, frames: 400 }]);
  gate.reset();
  // after reset only the absolute minimum applies, so quiet singing is heard
  const r = feed(gate, [{ rms: 0.02, midi: 60, frames: 30 }]);
  assert.equal(r.accepted, r.total);
});
