/**
 * Drives a whole staff-practice run frame by frame across all three stages:
 * the demonstration, the assisted pass, the praise beat, the unaided pass, and
 * the comparison — plus the two silent-room exits and the pipeline separation
 * that stage 2 depends on.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { Exercise } from '@/entities/exercise';
import { midiToFreq } from '@/shared/lib/music';
import { resetReferenceMonitor } from '@/shared/audio/referenceMonitor';
import { referenceContaminates } from '@/features/pitch-detection/lib/referenceGate';
import { createMelodyPlayer } from '../lib/melodyPlayer';
import {
  createRunController,
  DEMO_GAP_MS,
  TRANSITION_MS,
  type RunStore,
} from '../model/runController';
import type { AttemptComparison, NoteResult, PhraseSummary } from '@/entities/exercise';
import type { StaffStatus } from '../model/staffStore';

const exercise: Exercise = {
  id: 'test-phrase',
  title: 'Test phrase',
  source: 'test',
  key: 'C major',
  bpm: 60,
  category: 'warmup',
  difficulty: 'easy',
  notes: [
    { midi: 60, start: 0, duration: 1 },
    { midi: 62, start: 1, duration: 1 },
    { midi: 64, start: 2, duration: 1 },
  ],
};

/** the engine's frame cadence: HOP(512) / 44100 ≈ 11.6ms */
const FRAME_MS = 12;
const QUIET_RMS = 0.0008;
const SINGING_RMS = 0.05;
/** demo/accompaniment run leadIn(1.2) + phrase(3) + tail(0.3) */
const PLAYBACK_MS = 4500;
const LEAD_IN_MS = 1200;
/** frames per one-second note */
const NOTE_FRAMES = 84;

function makeStore() {
  const state = {
    status: 'idle' as StaffStatus,
    statuses: [] as StaffStatus[],
    playback: null as Parameters<RunStore['setPlayback']>[0] | null,
    pitch: null as Parameters<RunStore['setPitch']>[0] | null,
    results: [] as NoteResult[],
    accompaniedSummary: null as PhraseSummary | null,
    summary: null as PhraseSummary | null,
    comparison: null as AttemptComparison | null,
    resets: 0,
    stageClears: 0,
  };
  const store: RunStore = {
    reset() {
      state.resets++;
      state.playback = null;
      state.pitch = null;
      state.results = [];
      state.accompaniedSummary = null;
      state.summary = null;
      state.comparison = null;
    },
    clearStageFeedback() {
      state.stageClears++;
      state.results = [];
      state.pitch = null;
    },
    setStatus(status) {
      state.status = status;
      state.statuses.push(status);
    },
    setPlayback(patch) {
      state.playback = patch;
    },
    setPitch(patch) {
      state.pitch = patch;
    },
    addResult(result) {
      state.results.push(result);
    },
    setAccompaniedSummary(summary) {
      state.accompaniedSummary = summary;
    },
    setSummary(summary, comparison) {
      state.summary = summary;
      state.comparison = comparison;
      state.status = 'finished';
      state.statuses.push('finished');
    },
  };
  return { state, store };
}

function setup() {
  const { state, store } = makeStore();
  const now = () => Date.now();
  // the three players the hook builds, with the phrase clock driven by the same
  // mocked wall clock the test advances
  const demo = createMelodyPlayer(exercise.notes, () => controller.referenceFinished(), { now });
  const accompaniment = createMelodyPlayer(exercise.notes, () => controller.accompanimentFinished(), {
    now,
    gatesMicrophone: false,
  });
  const solo = createMelodyPlayer(exercise.notes, () => controller.phraseFinished(), {
    silent: true,
    leadIn: 0,
    now,
  });
  const controller = createRunController({ exercise, demo, accompaniment, solo, store, now });
  return { state, controller, demo, accompaniment, solo };
}

/** feed `count` frames of a steady sung pitch, advancing the clock as we go */
function sing(controller: ReturnType<typeof setup>['controller'], midi: number, count: number) {
  for (let i = 0; i < count; i++) {
    controller.onFrame({ frequency: midiToFreq(midi), rms: SINGING_RMS });
    mock.timers.tick(FRAME_MS);
  }
}

/** feed `count` frames of a quiet room */
function silence(controller: ReturnType<typeof setup>['controller'], count: number) {
  for (let i = 0; i < count; i++) {
    controller.onFrame({ frequency: null, rms: QUIET_RMS });
    mock.timers.tick(FRAME_MS);
  }
}

/**
 * Run the demonstration through to the downbeat of the assisted stage.
 *
 * Advances with real quiet frames rather than bare timer ticks: the voice gate
 * learns its noise floor from every frame that reaches it, including during
 * stages that grade nothing, so a run driven by ticks alone would meet the
 * singer with no idea what the room sounds like.
 */
function reachAccompanied(controller: ReturnType<typeof setup>['controller']) {
  controller.startRun();
  silence(controller, PLAYBACK_MS / FRAME_MS);
  silence(controller, DEMO_GAP_MS / FRAME_MS);
  silence(controller, LEAD_IN_MS / FRAME_MS);
}

/** sing the whole phrase over the guide and let stage 2 close out */
function performAccompanied(controller: ReturnType<typeof setup>['controller'], offset = 0) {
  sing(controller, 60 + offset, NOTE_FRAMES);
  sing(controller, 62 + offset, NOTE_FRAMES);
  sing(controller, 64 + offset, NOTE_FRAMES);
  // the accompaniment's own end timer closes the stage
  mock.timers.tick(PLAYBACK_MS);
}

/** carry a completed stage 2 through the praise beat into the solo stage */
function reachSolo(controller: ReturnType<typeof setup>['controller']) {
  mock.timers.tick(TRANSITION_MS);
}

beforeEach(() => {
  resetReferenceMonitor();
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
});

describe('stage 1 — listen', () => {
  it('animates the staff while the reference plays', () => {
    const { state, controller } = setup();
    controller.startRun();
    assert.equal(state.status, 'listen');

    mock.timers.tick(LEAD_IN_MS + 1200);

    assert.ok(state.playback, 'the playhead must move during the demonstration');
    assert.ok(state.playback!.position > 0, 'position should have advanced past the lead-in');
    assert.equal(state.playback!.activeNote, 1, 'the second note should be under the playhead');
    assert.equal(state.playback!.currentTargetMidi, 62);
  });

  it('ignores the microphone completely', () => {
    const { state, controller } = setup();
    controller.startRun();

    // even if the mic somehow hears something during the demonstration
    sing(controller, 60, 60);

    assert.equal(state.pitch, null, 'no live pitch during the demonstration');
    assert.equal(state.results.length, 0, 'no notes graded');
    assert.equal(state.summary, null, 'no score');
  });
});

describe('stage 2 — sing with accompaniment', () => {
  it('follows the demonstration automatically', () => {
    const { state, controller } = setup();
    controller.startRun();
    mock.timers.tick(PLAYBACK_MS);
    assert.equal(state.status, 'listen', 'still demonstrating until the gap elapses');

    mock.timers.tick(DEMO_GAP_MS);
    assert.equal(controller.stage, 'accompanied');
    assert.equal(state.status, 'accompanied');
  });

  it('grades the singer while the guide plays', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);

    sing(controller, 60, NOTE_FRAMES);
    sing(controller, 62, NOTE_FRAMES);

    assert.ok(state.pitch?.liveMidi != null, 'live pitch must be published while the guide plays');
    assert.ok(state.results.length >= 1, `expected graded notes, got ${state.results.length}`);
    assert.equal(state.results[0].verdict, 'perfect');
  });

  it('is clocked by the guide, not by the singer’s first note', () => {
    // stage 3 waits for a vocal onset; stage 2 must not — the accompaniment is
    // the clock and the singer follows it
    const { state, controller } = setup();
    reachAccompanied(controller);

    silence(controller, 60);

    assert.ok(state.playback!.position > 0, 'the phrase advances even before anyone sings');
  });

  it('scores the assisted pass separately from the unaided one', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);

    assert.ok(state.accompaniedSummary, 'the assisted pass must produce its own summary');
    assert.equal(state.summary, null, 'but not the run’s headline result');
    assert.equal(state.status, 'transition');
  });

  it('ends the run rather than scoring a room that never sang', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);

    silence(controller, 300);
    mock.timers.tick(PLAYBACK_MS);


    assert.equal(state.status, 'no-input');
    assert.equal(state.accompaniedSummary, null, 'silence is not an assisted attempt');
    assert.equal(state.summary, null);
  });
});

describe('stage 3 — sing independently', () => {
  it('starts after the praise beat, waiting for a voice', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    assert.equal(state.status, 'transition');

    reachSolo(controller);
    assert.equal(controller.stage, 'solo');
    assert.equal(state.status, 'listening');
  });

  it('stays put and scores nothing when the singer stays silent', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);

    silence(controller, 200);

    assert.equal(state.status, 'listening');
    assert.equal(state.results.length, 0);
    assert.equal(state.summary, null);
  });

  it('starts its clock on the singer’s first note', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);

    silence(controller, 50);
    sing(controller, 60, 20);

    assert.equal(state.status, 'running');
    assert.ok(state.pitch?.liveMidi != null, 'singing must produce a live note');
    assert.ok(Math.abs(state.pitch!.liveMidi! - 60) < 0.5, 'the detected note is what was sung');
    assert.equal(state.playback!.activeNote, 0, 'the first target note is active');
  });

  it('records the raw detector pitch, with no smoothing lag', () => {
    // The scoring path must see exactly what the detector reported. A pitch
    // smoother used to sit between the two; on a moving pitch its group delay
    // showed up as error, which is why it was removed. A rising ramp makes any
    // residual lag obvious: every trail entry must be a pitch that was actually
    // fed, never a filtered value in between.
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);
    silence(controller, 50);

    sing(controller, 60, 10);
    const ramp = [60.1, 60.2, 60.3, 60.4, 60.5, 60.6, 60.7, 60.8];
    for (const midi of ramp) {
      controller.onFrame({ frequency: midiToFreq(midi), rms: SINGING_RMS });
      mock.timers.tick(FRAME_MS);
    }

    const trail = state.pitch?.trail ?? [];
    const rampEntries = trail.filter((p) => p.midi > 60.05);
    assert.ok(rampEntries.length >= ramp.length - 1, `the ramp should be in the trail, got ${rampEntries.length}`);
    for (const entry of rampEntries) {
      assert.ok(
        ramp.some((m) => Math.abs(entry.midi - m) < 1e-9),
        `trail value ${entry.midi} is not one of the pitches that were sung — it has been filtered`
      );
    }
  });

  it('lets a single-frame outlier through to scoring rather than filtering it', () => {
    // The old median-of-3 removed isolated blips before scoring. Robustness now
    // belongs to the scorer's own aggregate; the frame stream stays honest.
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);
    silence(controller, 50);

    sing(controller, 60, 10);
    const blip = 72; // an octave up for exactly one frame
    controller.onFrame({ frequency: midiToFreq(blip), rms: SINGING_RMS });
    mock.timers.tick(FRAME_MS);
    sing(controller, 60, 10); // carry on, so a UI tick publishes the trail

    const trail = state.pitch?.trail ?? [];
    assert.ok(
      trail.some((p) => Math.abs(p.midi - blip) < 1e-9),
      'the outlier must reach the pitch path unmodified'
    );
  });

  it('reflects wrong notes rather than the reference', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);

    silence(controller, 50);
    // sing a third above every target
    sing(controller, 64, NOTE_FRAMES);
    sing(controller, 66, NOTE_FRAMES);
    sing(controller, 68, NOTE_FRAMES);

    assert.ok(state.results.length >= 2);
    assert.ok(
      state.results.every((r) => r.verdict === 'wrong'),
      `expected wrong verdicts, got ${state.results.map((r) => r.verdict).join(', ')}`
    );
  });
});

describe('results', () => {
  it('reports the unaided pass alongside a comparison of both attempts', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    reachSolo(controller);

    silence(controller, 50);
    sing(controller, 60, NOTE_FRAMES);
    sing(controller, 62, NOTE_FRAMES);
    sing(controller, 64, NOTE_FRAMES);
    mock.timers.tick(PLAYBACK_MS);

    assert.equal(state.status, 'finished');
    assert.ok(state.summary, 'the unaided pass is the headline result');
    assert.ok(state.comparison, 'both attempts must be compared');
    assert.equal(state.comparison!.accompaniedScore, state.accompaniedSummary!.score);
    assert.equal(state.comparison!.soloScore, state.summary!.score);
    assert.equal(
      state.comparison!.delta,
      state.summary!.score - state.accompaniedSummary!.score,
      'the difference is solo minus guided'
    );
  });

  it('does not carry stage 2’s verdicts into stage 3', () => {
    const { state, controller } = setup();
    reachAccompanied(controller);
    performAccompanied(controller);
    assert.ok(state.results.length > 0, 'stage 2 graded something');

    reachSolo(controller);

    assert.equal(state.results.length, 0, 'the unaided pass starts from a clean staff');
    assert.equal(state.pitch, null);
  });
});

describe('pipeline separation', () => {
  it('never writes a pitch from playback', () => {
    // the whole demonstration runs its ticker; not one frame of it may appear
    // as a detected pitch, a verdict or a score
    const { state, controller } = setup();
    controller.startRun();
    mock.timers.tick(PLAYBACK_MS);

    assert.ok(state.playback, 'playback moved the playhead');
    assert.equal(state.pitch, null, 'playback must never write the pitch channel');
    assert.equal(state.results.length, 0);
  });

  it('sounds the guide and grades the singer at the same time', () => {
    // the whole point of stage 2: audible accompaniment driving the animation
    // while microphone frames drive the pitch, verdicts and score
    const { state, controller, accompaniment } = setup();
    reachAccompanied(controller);

    assert.ok(accompaniment.playing, 'the guide must be sounding');
    assert.equal(referenceContaminates(), false, 'and must not gate the mic it sings over');

    sing(controller, 60, NOTE_FRAMES);
    sing(controller, 62, NOTE_FRAMES);

    assert.ok(state.playback!.position > 0, 'playback animates the staff');
    assert.ok(state.pitch?.liveMidi != null, 'the mic publishes live pitch');
    assert.ok(state.results.length >= 1, 'and the singer is graded');
  });
});
