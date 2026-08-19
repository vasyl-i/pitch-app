/**
 * The rule that keeps the app from grading its own playback: while reference
 * audio is sounding (plus a guard for the analysis window and room decay), the
 * microphone is not a source of evidence about the singer.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  isReferenceAudible,
  referenceAudibleThrough,
  resetReferenceMonitor,
  trackSounding,
} from '@/shared/audio/referenceMonitor';
import { REFERENCE_GUARD_MS, referenceContaminates } from '../lib/referenceGate';

const T0 = 1_000_000;

beforeEach(() => resetReferenceMonitor());

describe('reference monitor', () => {
  it('reports silence when nothing has been scheduled', () => {
    assert.equal(referenceAudibleThrough(T0), 0);
    assert.equal(isReferenceAudible(0, T0), false);
  });

  it('is audible for as long as a source claims the speaker', () => {
    const melody = trackSounding();
    melody.extendTo(T0 + 5000);

    assert.equal(isReferenceAudible(0, T0), true);
    assert.equal(isReferenceAudible(0, T0 + 4999), true);
    assert.equal(isReferenceAudible(0, T0 + 5000), false, 'horizon is exclusive');
  });

  it('keeps the furthest horizon when a source schedules more', () => {
    const melody = trackSounding();
    melody.extendTo(T0 + 1000);
    melody.extendTo(T0 + 4000);
    // a later note ending sooner must not shorten the claim
    melody.extendTo(T0 + 2000);

    assert.equal(referenceAudibleThrough(T0), T0 + 4000);
  });

  it('stays audible while any one of several sources is still sounding', () => {
    const prompt = trackSounding();
    const melody = trackSounding();
    prompt.extendTo(T0 + 1000);
    melody.extendTo(T0 + 6000);

    prompt.clear();

    assert.equal(isReferenceAudible(0, T0), true);
    assert.equal(referenceAudibleThrough(T0), T0 + 6000);
  });

  it('falls silent immediately when a cancelled source retracts its claim', () => {
    // cancelling a melody mid-run really does silence the speaker, so the mic
    // must reopen at once rather than stay gated for the notes never played
    const melody = trackSounding();
    melody.extendTo(T0 + 30_000);

    melody.clear();

    assert.equal(isReferenceAudible(0, T0), false);
  });

  it('stops being audible once the horizon passes', () => {
    trackSounding().extendTo(T0 + 100);
    assert.equal(isReferenceAudible(0, T0 + 500), false);
  });

  it('remembers a just-ended horizon so guard windows can still see it', () => {
    // the guard's whole job is to cover sound that stopped a moment ago;
    // forgetting the claim the instant it passed would defeat it silently
    trackSounding().extendTo(T0 + 100);
    assert.equal(referenceAudibleThrough(T0 + 500), T0 + 100);
  });

  it('eventually garbage-collects finished sources', () => {
    trackSounding().extendTo(T0);
    assert.equal(referenceAudibleThrough(T0 + 60_000), 0);
  });
});

describe('referenceContaminates', () => {
  it('rejects frames captured while the reference sounds', () => {
    trackSounding().extendTo(T0 + 3000);
    assert.equal(referenceContaminates(T0 + 1500), true);
  });

  it('keeps rejecting through the guard window after the last note ends', () => {
    // a frame carries the tail of the analysis window, so audio that stopped a
    // few tens of ms ago is still inside it
    trackSounding().extendTo(T0);

    assert.equal(referenceContaminates(T0 + REFERENCE_GUARD_MS - 1), true);
    assert.equal(referenceContaminates(T0 + REFERENCE_GUARD_MS), false);
  });

  it('accepts frames from a genuinely quiet room', () => {
    assert.equal(referenceContaminates(T0), false);
  });

  it('guards long enough to cover the YIN analysis window', () => {
    // WINDOW(512) / (44100 / DECIMATE(4)) ≈ 46ms of audio behind every frame
    assert.ok(REFERENCE_GUARD_MS > (512 / (44100 / 4)) * 1000);
  });
});
