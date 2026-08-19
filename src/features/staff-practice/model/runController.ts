/**
 * The staff-practice run as a plain state machine — no React, no native audio.
 *
 * A run teaches one phrase in three stages, each with less help than the last:
 *
 *   1. **Listen** — the reference sounds and the staff animates with it. The
 *      playhead moves, note tiles light up, the keyboard follows. Nothing is
 *      graded and the microphone is ignored outright; this stage exists to show
 *      the singer both the melody and where its notes live.
 *   2. **Accompanied** — the reference sounds *again* and the singer sings over it.
 *      Now both pipelines run at once: the accompaniment clocks the timeline,
 *      the microphone is graded. This pass is scored.
 *   3. **Solo** — the app is silent. The phrase clock starts on the singer's
 *      *first actual note*, so the timeline can only advance because someone
 *      sang. This pass is the one recorded to progress.
 *
 * Between 2 and 3 sits a short praise beat, and after 3 the two scores are
 * compared.
 *
 * ## The two pipelines
 *
 * Playback and microphone are kept strictly apart, and stage 2 is the reason
 * the separation has to be structural rather than a convention:
 *
 *   - **Playback** drives `store.setPlayback` and nothing else — position,
 *     which target note is current. It never writes a pitch, a verdict or a
 *     score. It runs off a ticker, because during audible playback the mic
 *     broker may be dropping every frame, so frames cannot be what animates the
 *     staff.
 *   - **Microphone** drives `store.setPitch`, `store.addResult` and the
 *     evaluators, and nothing else. It never moves the playhead in a stage a
 *     reference timeline is clocking.
 *
 * Whether the accompaniment can be *heard* in stage 2 is decided upstream by
 * the output route (`shared/audio/outputRoute`); this controller behaves
 * identically either way, because the guide is a visual timeline first and an
 * audible one only when the room allows it.
 *
 * This lives outside the hook so the whole flow can be driven frame by frame in
 * a test. `useStaffSession` is the React wiring around it.
 */
import {
  centsToTarget,
  compareAttempts,
  createPhraseEvaluator,
  type AttemptComparison,
  type Exercise,
  type NoteResult,
  type PhraseSummary,
} from '@/entities/exercise';
import { createThrottle, createVoiceGate } from '@/features/pitch-detection';
import { freqToMidi } from '@/shared/lib/music';
import type { MelodyPlayer } from '../lib/melodyPlayer';
import type { StaffStatus, SungSample } from './staffStore';

const UI_UPDATE_MS = 33;
const TRAIL_SECONDS = 6;
/** grade a note only once the playhead is clear of it */
const GRADE_LAG_SEC = 0.05;
/** silent beat between one stage's audio ending and the next beginning */
export const DEMO_GAP_MS = 600;
/** how long the "now try it on your own" card holds before the solo stage */
export const TRANSITION_MS = 1600;
/**
 * How long the solo pass waits for a first note before giving up. It ends the
 * run *without* a summary: a silent room is not a performance, so it must
 * never produce a score or a recorded session.
 */
export const SILENCE_TIMEOUT_MS = 20000;
/**
 * Consecutive voiced frames required before the phrase clock starts (~35ms at
 * the engine's hop). A door slam or a cough can produce one voiced-looking
 * frame; it cannot produce three pitch-continuous ones. The delay is well
 * inside the 100ms of each note's attack that grading discards anyway.
 */
const ONSET_FRAMES = 3;

export interface RunFrame {
  frequency: number | null;
  rms: number;
}

/** The slice of the staff store the run drives. */
export interface RunStore {
  reset(): void;
  clearStageFeedback(): void;
  setStatus(status: StaffStatus): void;
  /** written only by a reference timeline */
  setPlayback(patch: {
    position: number;
    positionUpdatedAt: number;
    activeNote: number;
    currentTargetMidi: number | null;
  }): void;
  /** written only by microphone frames */
  setPitch(patch: { liveMidi: number | null; liveCents: number | null; trail: SungSample[] }): void;
  addResult(result: NoteResult): void;
  setAccompaniedSummary(summary: PhraseSummary): void;
  setSummary(summary: PhraseSummary, comparison: AttemptComparison | null): void;
}

export interface RunControllerOptions {
  exercise: Exercise;
  /** stage 1: sounds the reference; its `onEnded` must call `referenceFinished()` */
  demo: MelodyPlayer;
  /** stage 2: the guide the singer sings over; `onEnded` must call `accompanimentFinished()` */
  accompaniment: MelodyPlayer;
  /** stage 3: silent timeline for the unaided pass; `onEnded` must call `phraseFinished()` */
  solo: MelodyPlayer;
  store: RunStore;
  /** a note the singer covered well enough to inform range learning */
  onWellSungNote?(midi: number, coverage: number): void;
  now?(): number;
}

export type RunStage = 'idle' | 'listen' | 'accompanied' | 'transition' | 'solo';

export interface RunController {
  /** (re)start the whole cycle from the reference demo */
  startRun(): void;
  /** the stage-1 reference has finished sounding */
  referenceFinished(): void;
  /** the stage-2 guide has run out */
  accompanimentFinished(): void;
  /** the stage-3 phrase timeline has run out */
  phraseFinished(): void;
  onFrame(frame: RunFrame): void;
  dispose(): void;
  readonly stage: RunStage;
}

export function createRunController({
  exercise,
  demo,
  accompaniment,
  solo,
  store,
  onWellSungNote,
  now = Date.now,
}: RunControllerOptions): RunController {
  // one evaluator per scored attempt: same engine, same exercise, two
  // independent tallies so the comparison comes from identical maths
  const accompaniedEvaluator = createPhraseEvaluator(exercise.notes);
  const soloEvaluator = createPhraseEvaluator(exercise.notes);
  const gate = createVoiceGate();
  const shouldUpdateUi = createThrottle(UI_UPDATE_MS);
  const trail: SungSample[] = [];

  let disposed = false;
  let stage: RunStage = 'idle';
  let stageTimer: ReturnType<typeof setTimeout> | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let tickTimer: ReturnType<typeof setTimeout> | null = null;
  /** run of consecutive voiced frames, used only to detect the vocal onset */
  let voicedRun = 0;
  /** did stage 2 ever hear a real voice? a silent room is not a performance */
  let heardVoiceInAccompanied = false;
  let accompaniedSummary: PhraseSummary | null = null;

  const clearTimers = () => {
    if (stageTimer) clearTimeout(stageTimer);
    if (silenceTimer) clearTimeout(silenceTimer);
    if (tickTimer) clearTimeout(tickTimer);
    stageTimer = null;
    silenceTimer = null;
    tickTimer = null;
  };

  const activeNoteAt = (t: number) =>
    exercise.notes.findIndex((n) => t >= n.start && t < n.start + n.duration);

  /** the timeline clocking the phrase right now, if any */
  const clock = (): MelodyPlayer | null =>
    stage === 'listen' ? demo : stage === 'accompanied' ? accompaniment : stage === 'solo' ? solo : null;

  const publishPlayback = (t: number, at: number) => {
    const noteIdx = activeNoteAt(t);
    store.setPlayback({
      position: t,
      positionUpdatedAt: at,
      activeNote: noteIdx,
      currentTargetMidi: noteIdx >= 0 ? exercise.notes[noteIdx].midi : null,
    });
  };

  /**
   * Playback's own clock. The staff has to animate during stages the mic
   * broker is gating, so the animation cannot be a side effect of mic frames —
   * it gets a ticker of its own. Recursive `setTimeout` rather than
   * `setInterval` so a test's fake timers can step it.
   */
  const tick = () => {
    tickTimer = setTimeout(() => {
      tickTimer = null;
      if (disposed) return;
      const player = clock();
      if (!player?.playing || (stage !== 'listen' && stage !== 'accompanied')) return;
      publishPlayback(player.currentTime(), now());
      tick();
    }, UI_UPDATE_MS);
  };

  const startPlaybackStage = (next: 'listen' | 'accompanied', status: StaffStatus, player: MelodyPlayer) => {
    stage = next;
    store.clearStageFeedback();
    store.setStatus(status);
    trail.length = 0;
    player.start();
    publishPlayback(-player.leadIn, now());
    tick();
  };

  /** stage 2 → praise beat → stage 3 */
  const beginTransition = () => {
    stage = 'transition';
    store.setStatus('transition');
    stageTimer = setTimeout(() => {
      stageTimer = null;
      if (disposed) return;
      beginSoloStage();
    }, TRANSITION_MS);
  };

  const beginSoloStage = () => {
    stage = 'solo';
    store.clearStageFeedback();
    store.setStatus('listening');
    trail.length = 0;
    voicedRun = 0;
    silenceTimer = setTimeout(() => {
      silenceTimer = null;
      if (disposed || solo.playing) return;
      stage = 'idle';
      store.setStatus('no-input');
    }, SILENCE_TIMEOUT_MS);
  };

  /** the singer's first note in the solo stage starts its clock */
  const beginSoloSinging = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    solo.start();
    store.setStatus('running');
  };

  /**
   * Grade one voiced/unvoiced frame against `evaluator` at phrase time `t`.
   * `ui` is the throttle's answer for this frame, decided once by the caller —
   * asking it twice would let the playhead and the pitch overlay land on
   * different frames.
   */
  const gradeFrame = (
    evaluator: ReturnType<typeof createPhraseEvaluator>,
    t: number,
    voicedMidi: number | null,
    ui: boolean
  ) => {
    for (const result of evaluator.collectCompleted(t - GRADE_LAG_SEC)) {
      store.addResult(result);
      if (result.verdict !== 'wrong' && result.verdict !== 'missed') {
        onWellSungNote?.(exercise.notes[result.noteIndex].midi, result.coverage);
      }
    }

    if (voicedMidi === null) {
      if (ui) store.setPitch({ liveMidi: null, liveCents: null, trail: [...trail] });
      return;
    }

    // Raw detector pitch, unfiltered, all the way into the evaluator. A pitch
    // smoother used to sit here and fed both scoring and rendering; it was
    // measured as the largest source of user-visible pitch error on real
    // singing. Visual steadiness of the *note name* is applied at the point of
    // display instead — see features/pitch-visualization's note stabilizer.
    const noteIdx = activeNoteAt(t);
    const cents = noteIdx >= 0 ? centsToTarget(voicedMidi, exercise.notes[noteIdx].midi) : null;
    evaluator.addFrame(t, voicedMidi);
    trail.push({ t, midi: voicedMidi, cents });
    while (trail.length && trail[0].t < t - TRAIL_SECONDS) trail.shift();
    if (ui) store.setPitch({ liveMidi: voicedMidi, liveCents: cents, trail: [...trail] });
  };

  return {
    get stage() {
      return stage;
    },

    startRun() {
      if (disposed) return;
      clearTimers();
      demo.stop();
      accompaniment.stop();
      solo.stop();
      accompaniedEvaluator.reset();
      soloEvaluator.reset();
      accompaniedSummary = null;
      heardVoiceInAccompanied = false;
      trail.length = 0;
      // the gate deliberately keeps its learned noise floor across a restart —
      // the room hasn't changed, and relearning it wastes the quiet beat the
      // stage gaps give us
      voicedRun = 0;
      store.reset();
      startPlaybackStage('listen', 'listen', demo);
    },

    referenceFinished() {
      if (disposed || stage !== 'listen') return;
      demo.stop();
      // a beat of silence so the last reference note's decay is fully gone
      // before the sing-along opens
      stageTimer = setTimeout(() => {
        stageTimer = null;
        if (disposed) return;
        startPlaybackStage('accompanied', 'accompanied', accompaniment);
      }, DEMO_GAP_MS);
    },

    accompanimentFinished() {
      if (disposed || stage !== 'accompanied') return;
      accompaniment.stop();
      if (tickTimer) clearTimeout(tickTimer);
      tickTimer = null;

      // nobody sang over the guide: there is no assisted attempt to score, and
      // sending them on to the solo stage to fail twice helps no one
      if (!heardVoiceInAccompanied) {
        stage = 'idle';
        store.setStatus('no-input');
        return;
      }

      accompaniedSummary = accompaniedEvaluator.summary();
      store.setAccompaniedSummary(accompaniedSummary);
      beginTransition();
    },

    phraseFinished() {
      if (disposed || stage !== 'solo') return;
      stage = 'idle';
      solo.stop();
      const soloSummary = soloEvaluator.summary();
      store.setSummary(soloSummary, accompaniedSummary ? compareAttempts(accompaniedSummary, soloSummary) : null);
    },

    onFrame(frame) {
      const at = now();
      const rawMidi = frame.frequency ? freqToMidi(frame.frequency) : null;
      // Every frame that gets here is already known to be free of our own
      // playback — either the mic broker dropped the rest, or the output route
      // is private and there is nothing to leak. So it is safe to let the gate
      // learn the room from all of them, including the quiet stage gaps.
      const isVoice = gate.accept(frame.rms, rawMidi, at);
      const ui = shouldUpdateUi(at);

      // stage 1 is a demonstration: the microphone is ignored completely, and
      // no verdict, pitch or score may come out of it
      if (stage !== 'accompanied' && stage !== 'solo') return;

      const voicedMidi = rawMidi !== null && isVoice ? rawMidi : null;
      if (voicedMidi !== null) gate.confirm(voicedMidi, at);

      if (stage === 'accompanied') {
        // the guide is the clock here — the singer follows it rather than
        // starting it, so there is no onset gate
        if (!accompaniment.playing) return;
        if (voicedMidi !== null) heardVoiceInAccompanied = true;
        gradeFrame(accompaniedEvaluator, accompaniment.currentTime(), voicedMidi, ui);
        return;
      }

      if (!solo.playing) {
        // still waiting for a real vocal onset: the phrase stays put, so
        // nothing advances, highlights or scores until someone actually sings
        voicedRun = voicedMidi === null ? 0 : voicedRun + 1;
        if (voicedRun < ONSET_FRAMES) return;
        beginSoloSinging();
      }

      const t = solo.currentTime();
      // the unaided pass has no reference timeline, so the singer's own clock
      // is what moves the playhead
      if (ui) publishPlayback(t, at);
      gradeFrame(soloEvaluator, t, voicedMidi, ui);
    },

    dispose() {
      disposed = true;
      stage = 'idle';
      clearTimers();
    },
  };
}
