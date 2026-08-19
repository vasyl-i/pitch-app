/**
 * The one place a microphone frame can be silently dropped: the broker's
 * reference interlock. This drives real recorder callbacks through the real
 * pitch engine while the real melody player sounds, to prove the mic is gated
 * during playback *and* — the regression that matters — let back in after it.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { __recorders, __resetRecorders, __resetSession, __session } from '../../../../scripts/stubs/react-native-audio-api';
import { createMelodyPlayer } from '@/features/staff-practice/lib/melodyPlayer';
import { resetReferenceMonitor } from '@/shared/audio/referenceMonitor';
import { acquireMic, releaseMic, type PitchFrame } from '../lib/micBroker';

const notes = [
  { midi: 60, start: 0, duration: 1 },
  { midi: 62, start: 1, duration: 1 },
];

/** enough buffers to fill the engine's analysis window and emit frames */
function pump(amplitude: number, buffers = 12) {
  const rec = __recorders[__recorders.length - 1];
  assert.ok(rec, 'a recorder should exist');
  for (let i = 0; i < buffers; i++) rec.__emit(220, amplitude);
}

beforeEach(async () => {
  await releaseMic();
  __resetRecorders();
  __resetSession();
  resetReferenceMonitor();
});

describe('mic lifecycle across a re-acquire', () => {
  // The regression that made the mic stop existing: a session hook whose effect
  // re-runs while `acquireMic` is still in flight ends up releasing a lease the
  // next acquire has already pre-empted. Because the iOS audio session is
  // process-wide, that stale teardown used to deactivate the session belonging
  // to the live recorder — playback kept working (it runs on the AudioContext),
  // so it looked like the microphone had silently vanished.
  it('keeps the session active when a stale lease is released late', async () => {
    const stale = await acquireMic({ onFrame: () => {} });

    const frames: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => frames.push(f) });

    // the previous screen's cleanup finally runs, releasing a dead lease
    await stale.release();

    assert.equal(__session.active, true, 'the live recorder still needs the session');

    pump(0.2);
    assert.ok(frames.length > 0, 'the live lease must keep receiving frames');
  });

  it('does not deactivate the session more than it activated it', async () => {
    const lease = await acquireMic({ onFrame: () => {} });
    await lease.release();
    await lease.release();
    await releaseMic();

    assert.ok(
      __session.deactivations <= __session.activations,
      `${__session.deactivations} deactivations for ${__session.activations} activations`
    );
    assert.equal(__session.active, false);
  });

  it('hands the session over cleanly so the newest lease is the live one', async () => {
    const first: PitchFrame[] = [];
    const second: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => first.push(f) });
    await acquireMic({ onFrame: (f) => second.push(f) });

    pump(0.2);

    assert.equal(first.length, 0, 'the pre-empted lease goes quiet');
    assert.ok(second.length > 0, 'the current lease receives frames');
  });
});

describe('mic broker reference interlock', () => {
  it('delivers frames when nothing is playing', async () => {
    const frames: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => frames.push(f) });

    pump(0.2);

    assert.ok(frames.length > 0, 'a quiet-room mic must deliver frames');
  });

  it('drops frames while the reference melody sounds', async () => {
    const frames: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => frames.push(f) });

    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    pump(0.2);

    assert.equal(frames.length, 0, 'playback must never reach the pitch detector');
  });

  it('delivers frames again once the reference stops', async () => {
    const frames: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => frames.push(f) });

    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    pump(0.2);
    assert.equal(frames.length, 0);

    player.stop();
    pump(0.2);

    assert.ok(frames.length > 0, 'the mic must come back for the sing pass');
  });

  it('detects the sung pitch after the reference stops', async () => {
    const frames: PitchFrame[] = [];
    await acquireMic({ onFrame: (f) => frames.push(f) });

    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    player.stop();
    pump(0.3, 20);

    const detected = frames.filter((f) => f.frequency !== null);
    assert.ok(detected.length > 0, 'a sung tone must produce a detected pitch');
    assert.ok(
      Math.abs(detected[detected.length - 1].frequency! - 220) < 10,
      `expected ~220Hz, got ${detected[detected.length - 1].frequency}`
    );
  });
});
