import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { HAPTIC_LEAD_MS, startBeatClock, type BeatClockState } from '../lib/beatClock';

/** a store whose playhead advances like a run's: published every `publishMs` */
function fakeRun(rate: number, publishMs = 33) {
  let state: BeatClockState = { status: 'loading', position: 0, positionUpdatedAt: 0 };
  const listeners = new Set<(s: BeatClockState, p: BeatClockState) => void>();
  const set = (patch: Partial<BeatClockState>) => {
    const prev = state;
    state = { ...state, ...patch };
    for (const l of listeners) l(state, prev);
  };
  let startedAt = 0;
  let from = 0;
  let publisher: ReturnType<typeof setInterval> | null = null;
  return {
    store: {
      getState: () => state,
      subscribe: (l: (s: BeatClockState, p: BeatClockState) => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    },
    /** start the timeline at phrase time `at` (negative = lead-in) */
    play(status: string, at: number) {
      startedAt = Date.now();
      from = at;
      set({ position: at, positionUpdatedAt: startedAt, status });
      if (publisher) clearInterval(publisher);
      publisher = setInterval(() => {
        set({ position: from + ((Date.now() - startedAt) / 1000) * rate, positionUpdatedAt: Date.now() });
      }, publishMs);
    },
    stop(status: string) {
      if (publisher) clearInterval(publisher);
      set({ status });
    },
  };
}

const ticking = (s: string) => s === 'listen' || s === 'running';

/** advance fake time in 1 ms steps, so each timer sees the clock it fires at */
function advance(ms: number) {
  for (let i = 0; i < ms; i++) mock.timers.tick(1);
}

test('taps once per beat, on the beat, through a count-in', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  try {
    const run = fakeRun(1);
    const beats: { beat: number; at: number }[] = [];
    const stop = startBeatClock({ bpm: 120, rate: 1, store: run.store, ticking, onBeat: (beat) => beats.push({ beat, at: Date.now() }) });
    run.play('listen', -1);
    advance(3_000); // −1 s … +2 s at 0.5 s a beat
    stop();
    assert.deepEqual(beats.map((b) => b.beat), [-2, -1, 0, 1, 2, 3, 4]);
    // each tap a touch ahead of its beat, to be felt on it (beat 0 lands 1 s
    // after the start; the first count-in beat is the start itself)
    for (const { beat, at } of beats) {
      const due = Math.max(1_000_000, 1_000_000 + 1_000 + beat * 500 - HAPTIC_LEAD_MS);
      assert.ok(Math.abs(at - due) <= 5, `beat ${beat} at ${at}`);
    }
  } finally {
    mock.timers.reset();
  }
});

test('follows the playback speed and stays quiet between stages', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  try {
    const run = fakeRun(1.5, 100);
    const beats: number[] = [];
    const stop = startBeatClock({ bpm: 90, rate: 1.5, store: run.store, ticking, onBeat: (b) => beats.push(b) });
    run.play('running', 0);
    advance(2_000); // 3 s of phrase at 90 bpm (0.667 s a beat): beats 0–4
    run.stop('transition');
    advance(2_000);
    stop();
    assert.deepEqual(beats, [0, 1, 2, 3, 4]);
  } finally {
    mock.timers.reset();
  }
});

test('a restart counts again from the top, without a double tap', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  try {
    const run = fakeRun(1);
    const beats: number[] = [];
    const stop = startBeatClock({ bpm: 120, rate: 1, store: run.store, ticking, onBeat: (b) => beats.push(b) });
    run.play('listen', 0);
    advance(1_100); // beats 0, 1, 2
    run.play('listen', 0); // restarted
    advance(600); // beats 0, 1
    stop();
    assert.deepEqual(beats, [0, 1, 2, 0, 1]);
  } finally {
    mock.timers.reset();
  }
});

test('a busy JS thread makes taps late, never missing — at any speed', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  try {
    const run = fakeRun(2);
    const beats: number[] = [];
    const stop = startBeatClock({ bpm: 120, rate: 2, store: run.store, ticking, onBeat: (b) => beats.push(b) });
    run.play('running', 0);
    // timers only get to run every 35 ms; 3 s at double speed is 6 s of
    // phrase, beats 0–11 (a 40 ms phrase-time window used to drop most)
    for (let i = 0; i < 85; i++) mock.timers.tick(35);
    stop();
    assert.deepEqual(beats, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  } finally {
    mock.timers.reset();
  }
});
