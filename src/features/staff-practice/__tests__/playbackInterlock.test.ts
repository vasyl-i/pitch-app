/**
 * Drives the real playback path (melodyPlayer → toneBus → reference monitor)
 * against the real mic-side interlock, to pin down when the microphone is
 * gated and — critically — when it is let back in.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { referenceContaminates } from '@/features/pitch-detection/lib/referenceGate';
import { resetReferenceMonitor } from '@/shared/audio/referenceMonitor';
import { __oscillators, __resetOscillators } from '../../../../scripts/stubs/react-native-audio-api';
import { createMelodyPlayer } from '../lib/melodyPlayer';

const notes = [
  { midi: 60, start: 0, duration: 1 },
  { midi: 62, start: 1, duration: 1 },
  { midi: 64, start: 2, duration: 1 },
];

beforeEach(() => {
  resetReferenceMonitor();
  __resetOscillators();
});

describe('what each stage actually sounds', () => {
  it('sounds the accompaniment — stage 2 is a sing-along, not a silent guide', () => {
    // the regression this pins: an accompaniment that animates but makes no
    // sound is not stage 2. It must schedule a voice for every target note,
    // and it must do so *without* gating the mic it is sung over.
    const accompaniment = createMelodyPlayer(notes, () => {}, { gatesMicrophone: false });
    accompaniment.start();

    assert.equal(__oscillators.length, notes.length, 'one voice per note must be scheduled');
    assert.equal(referenceContaminates(), false, 'and the singer must still be heard');
  });

  it('sounds the demo', () => {
    createMelodyPlayer(notes, () => {}, {}).start();
    assert.equal(__oscillators.length, notes.length);
  });

  it('sounds nothing for the solo pass', () => {
    createMelodyPlayer(notes, () => {}, { silent: true, leadIn: 0 }).start();
    assert.equal(__oscillators.length, 0, 'the unaided pass has no oscillator to leak from');
  });
});

describe('reference playback gating the mic', () => {
  it('lets the mic through when nothing is playing', () => {
    createMelodyPlayer(notes, () => {}, {});
    assert.equal(referenceContaminates(), false);
  });

  it('gates the mic while the reference is scheduled', () => {
    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    assert.equal(referenceContaminates(), true);
  });

  it('lets the mic back in once the reference is stopped', () => {
    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    player.stop();
    assert.equal(referenceContaminates(), false, 'mic must reopen for the sing pass');
  });

  it('lets the mic back in after dispose', () => {
    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    player.dispose();
    assert.equal(referenceContaminates(), false);
  });

  it('never gates the mic for a silent player', () => {
    const player = createMelodyPlayer(notes, () => {}, { silent: true, leadIn: 0 });
    player.start();
    assert.equal(referenceContaminates(), false, 'the sing pass makes no sound');
  });

  it('runs a full demo → accompanied → solo cycle with the mic open from stage 2', () => {
    // exactly the sequence useStaffSession runs. The demo gates while it
    // sounds; the accompaniment sounds *and* leaves the mic open, which is what
    // makes the sing-along gradeable; the solo pass makes no sound at all.
    const demo = createMelodyPlayer(notes, () => {}, {});
    const accompaniment = createMelodyPlayer(notes, () => {}, { gatesMicrophone: false });
    const solo = createMelodyPlayer(notes, () => {}, { silent: true, leadIn: 0 });

    demo.start();
    assert.equal(referenceContaminates(), true, 'gated during the demonstration');

    demo.stop();
    assert.equal(referenceContaminates(), false, 'open as soon as the demonstration ends');

    accompaniment.start();
    assert.equal(referenceContaminates(), false, 'the guide must not gate the pass it accompanies');

    accompaniment.stop();
    solo.start();
    assert.equal(referenceContaminates(), false, 'still open once the singer is on their own');
  });

  it('keeps the mic open across a demo → solo handover on the speaker', () => {
    // the loudspeaker path, where the interlock is load-bearing: the demo
    // gates while it sounds and the mic must be live for the whole solo pass.
    const demo = createMelodyPlayer(notes, () => {}, {});
    const solo = createMelodyPlayer(notes, () => {}, { silent: true, leadIn: 0 });

    demo.start();
    assert.equal(referenceContaminates(), true, 'gated during the demonstration');

    demo.stop();
    assert.equal(referenceContaminates(), false, 'open as soon as the demonstration ends');

    solo.start();
    assert.equal(referenceContaminates(), false, 'still open once the singer starts');
  });

  it('still gates by default, so opting out has to be deliberate', () => {
    // every other sound in the app — prompt tones, the demo — must keep gating.
    // Only the accompaniment opts out, and only because its stage requires it.
    const player = createMelodyPlayer(notes, () => {}, {});
    player.start();
    assert.equal(referenceContaminates(), true);
  });

  it('reopens the mic once a non-gating accompaniment is stopped', () => {
    const accompaniment = createMelodyPlayer(notes, () => {}, { gatesMicrophone: false });
    accompaniment.start();
    accompaniment.stop();
    assert.equal(referenceContaminates(), false);
  });
});
