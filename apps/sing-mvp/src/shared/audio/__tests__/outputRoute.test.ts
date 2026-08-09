/**
 * The rule that decides whether the accompaniment may sound while the mic is
 * being graded. It has to fail closed: a wrong "yes" puts the app's own
 * oscillator under the microphone, where it grades as a flawless performance.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPrivateOutput } from '../outputRoute';

describe('private output routes', () => {
  it('accepts wired and USB headphones', () => {
    // iOS reports the raw AVAudioSessionPort constant
    assert.equal(isPrivateOutput(['Headphones']), true);
    assert.equal(isPrivateOutput(['USBAudio']), true);
    // Android reports a name derived from AudioDeviceInfo.type
    assert.equal(isPrivateOutput(['Wired Headphones']), true);
    assert.equal(isPrivateOutput(['Wired Headset']), true);
  });

  it('accepts bluetooth on both platforms', () => {
    assert.equal(isPrivateOutput(['BluetoothA2DP']), true);
    assert.equal(isPrivateOutput(['BluetoothHFP']), true);
    assert.equal(isPrivateOutput(['Bluetooth A2DP']), true);
    assert.equal(isPrivateOutput(['Bluetooth SCO']), true);
  });

  it('rejects anything the room can hear', () => {
    assert.equal(isPrivateOutput(['Speaker']), false);
    assert.equal(isPrivateOutput(['Built-in Speaker']), false);
    assert.equal(isPrivateOutput(['Receiver']), false);
    assert.equal(isPrivateOutput(['AirPlay']), false);
    assert.equal(isPrivateOutput(['CarAudio']), false);
    assert.equal(isPrivateOutput(['HDMI']), false);
  });

  it('rejects a mixed route where one output is the speaker', () => {
    // iOS can route to both at once, and one loudspeaker is enough to put the
    // accompaniment back under the microphone
    assert.equal(isPrivateOutput(['Headphones', 'Speaker']), false);
    assert.equal(isPrivateOutput(['Speaker', 'BluetoothA2DP']), false);
  });

  it('fails closed on anything it does not recognise', () => {
    assert.equal(isPrivateOutput([]), false, 'no route is not a private route');
    assert.equal(isPrivateOutput(['Other (22)']), false);
    assert.equal(isPrivateOutput(['unknown']), false);
    assert.equal(isPrivateOutput(['']), false);
  });
});
