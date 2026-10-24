/**
 * The timing core of the haptic metronome, free of React and native modules
 * so it can be tested on its own.
 *
 * Beats are scheduled off the playhead a run publishes (position plus how long
 * ago it was stamped), re-synced on every publish, so they follow speed
 * changes, restarts and stage handovers without drifting.
 */

/** the playhead and stage, as the staff store publishes them */
export interface BeatClockState {
  status: string;
  /** phrase time, seconds */
  position: number;
  /** epoch ms the position was stamped at; 0 before any playback */
  positionUpdatedAt: number;
}

export interface BeatClockStore {
  getState(): BeatClockState;
  subscribe(listener: (state: BeatClockState, prev: BeatClockState) => void): () => void;
}

/**
 * Aim each tap this far ahead of its beat: the call hops to the main thread
 * and the actuator spins up before it is felt, so a tap sent on the beat
 * lands late — and the singer, following it, sings late.
 */
export const HAPTIC_LEAD_MS = 10;
/** a timer this much early still taps (JS timers land on display frames) */
const EARLY_SLACK_MS = 17;
/**
 * …and this much late. Wall time, not phrase time, so it holds at every
 * speed. A busy JS thread (a render, a burst of mic frames) delays timers by
 * tens of ms; a slightly late tap beats a missing one, but past this it would
 * mislead more than help.
 */
const LATE_SLACK_MS = 90;
/** a re-sync that moves the due time by less than this leaves the timer alone */
const RESYNC_MS = 4;

/**
 * Call `onBeat` on every beat while `ticking(status)` holds; returns a stopper.
 *
 * @param bpm  the exercise's authored tempo — its notes are timed in beats of it
 * @param rate the playback speed; phrase time runs this many times real time
 */
export function startBeatClock({
  bpm,
  rate,
  store,
  ticking,
  onBeat,
  now = Date.now,
}: {
  bpm: number;
  rate: number;
  store: BeatClockStore;
  ticking: (status: string) => boolean;
  /** beat index; negative beats are the lead-in's count-in */
  onBeat: (beat: number) => void;
  now?: () => number;
}): () => void {
  if (bpm <= 0 || rate <= 0) return () => {};
  const beatSec = 60 / bpm;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** the beat the timer is set for, and the wall time it is due to tap */
  let pending: { beat: number; due: number } | null = null;
  /** index of the last beat handled, so a re-sync can't tap the same beat twice */
  let lastBeat = -Infinity;

  /** phrase time now, extrapolated from the last published playhead; null before there is one */
  const positionNow = () => {
    const { position, positionUpdatedAt } = store.getState();
    if (!positionUpdatedAt) return null;
    return position + ((now() - positionUpdatedAt) / 1000) * rate;
  };

  /** wall ms from now until a beat's tap is due (negative: overdue) */
  const msUntilTap = (beat: number, pos: number) => ((beat * beatSec - pos) / rate) * 1000 - HAPTIC_LEAD_MS;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  /** line the timer up on the next beat from the freshest playhead */
  const schedule = () => {
    const pos = positionNow();
    if (pos === null || !ticking(store.getState().status)) return cancel();
    // the playhead went back (a restart, a new stage): start counting afresh
    if (pos < (lastBeat - 1) * beatSec) lastBeat = -Infinity;
    // the first beat whose tap is not already too late to send
    // (+ 0 turns the −0 a ceil just under zero gives into 0)
    const lateSec = ((LATE_SLACK_MS - HAPTIC_LEAD_MS) / 1000) * rate;
    const beat = Math.max(Math.ceil((pos - lateSec) / beatSec) + 0, lastBeat + 1);
    const wait = msUntilTap(beat, pos);
    const due = now() + wait;
    // the playhead is re-published many times a second; only move the timer
    // when that actually changes where the beat falls
    if (timer && pending && pending.beat === beat && Math.abs(pending.due - due) < RESYNC_MS) return;
    cancel();
    pending = { beat, due };
    timer = setTimeout(() => fire(beat), Math.max(0, wait));
  };

  const fire = (beat: number) => {
    timer = null;
    pending = null;
    const pos = positionNow();
    if (pos === null || !ticking(store.getState().status)) return;
    const wait = msUntilTap(beat, pos);
    // woke well before the beat (the playhead was re-stamped): wait it out
    if (wait > EARLY_SLACK_MS) return schedule();
    lastBeat = beat;
    if (wait >= -LATE_SLACK_MS) onBeat(beat);
    schedule();
  };

  // every published playhead (and stage change) re-syncs the next beat
  const unsubscribe = store.subscribe((state, prev) => {
    if (state.status !== prev.status || state.positionUpdatedAt !== prev.positionUpdatedAt) schedule();
  });
  schedule();

  return () => {
    unsubscribe();
    cancel();
  };
}
