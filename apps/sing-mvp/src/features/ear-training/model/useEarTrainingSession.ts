/**
 * The ear-training session engine. Drives every exercise through one
 * lifecycle:
 *
 *   idle → preparing → playing → (waiting) → (countdown) → listening
 *        → evaluating → round-result → … → completed
 *
 * Reliability rules this engine enforces (each one was a live bug before):
 *
 * - A round cannot begin until playback is verifiably ready
 *   (`ensurePlaybackReady`) and, for singing exercises, the mic lease is
 *   held. Failures land as a friendly notice on the picker, never a silent
 *   round.
 * - Every async continuation (prompt end, countdown tick, window close,
 *   result advance) is tagged with a guard generation; any user action that
 *   changes course ("hear it again", End, tab blur) invalidates the
 *   generation first, so no stale timer can fire into the new state — the
 *   old code double-recorded rounds exactly this way.
 * - The live readout and the final verdict come from the same evaluator over
 *   the same capture log, so the score the user watched is the score they
 *   get.
 * - The mic must not outlive the session: a leaked lease would collide with
 *   the staff-practice screen's recorder. Released on completion, exit,
 *   unmount and failure.
 */
import { useEffect, useRef } from 'react';
import { promptRange, useProfileStore } from '@/entities/profile';
import { acquireMic, createThrottle, MicPermissionError, type MicLease, type PitchFrame } from '@/features/pitch-detection';
import { useProgressStore } from '@/features/progress';
import { createSessionGuard } from '@/shared/lib/sessionGuard';
import { createSingCapture } from '../lib/capture';
import { summarizeSession, type RoundScore } from '../lib/evaluators';
import { buildEarSessionRecord } from '../lib/progressRecord';
import { createPromptPlayer, ensurePlaybackReady, PlaybackError } from '../lib/promptPlayer';
import { exerciseById } from './definitions';
import { useEarTrainingStore } from './earTrainingStore';
import type { EarRound, ExerciseDefinition, SingResponse } from './types';

const LIVE_EVAL_MS = 150;
/** brief beat on "evaluating" so the transition reads, not to compute anything */
const EVALUATING_MS = 400;
const DEFAULT_RESULT_MS = 1700;
const COUNTDOWN_STEP_MS = 800;

function friendlyStartupMessage(err: unknown): string {
  if (err instanceof MicPermissionError) {
    return 'Microphone access is needed for this exercise. You can enable it in Settings.';
  }
  if (err instanceof PlaybackError) {
    return 'We couldn’t start audio playback — check your volume and try again.';
  }
  return 'Something went wrong starting the session — give it another try.';
}

export function useEarTrainingSession() {
  const guardRef = useRef(createSessionGuard());
  const playerRef = useRef(createPromptPlayer());
  const captureRef = useRef(createSingCapture());
  const throttleRef = useRef(createThrottle(LIVE_EVAL_MS));
  const leaseRef = useRef<MicLease | null>(null);

  const defRef = useRef<ExerciseDefinition | null>(null);
  const difficultyRef = useRef<string | null>(null);
  const roundsRef = useRef<EarRound[]>([]);
  const currentRoundRef = useRef<EarRound | null>(null);
  const listeningRef = useRef(false);
  const previousPcRef = useRef<number | undefined>(undefined);

  const guard = guardRef.current;
  const player = playerRef.current;
  const capture = captureRef.current;
  const setStore = (partial: Parameters<ReturnType<typeof useEarTrainingStore.getState>['set']>[0]) =>
    useEarTrainingStore.getState().set(partial);

  /** invalidate everything in flight and get the generation for what's next */
  const freshGeneration = () => {
    guard.invalidate();
    return guard.generation;
  };

  const releaseLease = () => {
    const lease = leaseRef.current;
    leaseRef.current = null;
    return lease?.release() ?? Promise.resolve();
  };

  const stopEverything = () => {
    guard.invalidate();
    player.cancel();
    listeningRef.current = false;
    capture.reset();
    void releaseLease();
  };

  /** abort the session with a friendly banner on the picker */
  const failSession = (notice: string) => {
    stopEverything();
    useEarTrainingStore.getState().reset();
    setStore({ notice });
  };

  useEffect(() => {
    return () => {
      stopEverything();
      useEarTrainingStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- mic ------------------------------ */

  const onFrame = (frame: PitchFrame) => {
    capture.push(frame);
    if (!listeningRef.current) return;
    const response = currentRoundRef.current?.response;
    if (!response || response.kind !== 'sing') return;
    if (!throttleRef.current(Date.now())) return;

    // the live readout IS the round evaluation, just run early
    const frames = capture.frames;
    const score = frames.length > 0 ? response.evaluate(frames) : null;
    setStore({ live: { note: capture.live.note, score, outcomes: score?.notes ?? null } });
  };

  async function ensureMic(gen: number) {
    if (leaseRef.current) return;
    const lease = await acquireMic({
      onFrame,
      onInterruption: (phase) => {
        // a phone call / Siri / alarm took the audio hardware mid-session
        if (phase !== 'began') return;
        const current = useEarTrainingStore.getState().phase;
        if (current !== 'idle' && current !== 'completed') {
          failSession('The audio was interrupted, so the session was paused. Ready when you are.');
        }
      },
      onError: () => {
        failSession('The microphone hit a problem — give it another try.');
      },
    });
    // the session may have ended (or restarted) while the recorder spun up;
    // a lease nobody owns must be released, not stored
    if (!guard.isCurrent(gen)) {
      void lease.release();
      return;
    }
    leaseRef.current = lease;
  }

  /* --------------------------- lifecycle --------------------------- */

  function afterPrompt(gen: number, round: EarRound) {
    if (!guard.isCurrent(gen)) return;
    if (round.response.kind === 'choice') {
      setStore({ phase: 'listening', choices: round.response.options });
      return;
    }
    if (round.response.holdSec) startWait(gen, round.response);
    else startCountdown(gen, round.response);
  }

  async function playPrompt(gen: number, round: EarRound) {
    listeningRef.current = false;
    capture.end();
    setStore({ phase: 'playing', countdown: null, waitSecondsLeft: null, choices: null, live: { note: null, score: null, outcomes: null } });
    const handle = player.play(round.prompt);
    await handle.done;
    afterPrompt(gen, round);
  }

  function startWait(gen: number, response: SingResponse) {
    const tick = (left: number) => {
      if (!guard.isCurrent(gen)) return;
      if (left <= 0) {
        startCountdown(gen, response);
        return;
      }
      setStore({ phase: 'waiting', waitSecondsLeft: left });
      guard.later(gen, () => tick(left - 1), 1000);
    };
    tick(response.holdSec ?? 0);
  }

  function startCountdown(gen: number, response: SingResponse) {
    const step = (k: number) => {
      if (!guard.isCurrent(gen)) return;
      if (k <= 0) {
        openSingWindow(gen, response);
        return;
      }
      setStore({ phase: 'countdown', countdown: k, waitSecondsLeft: null });
      guard.later(gen, () => step(k - 1), COUNTDOWN_STEP_MS);
    };
    step(response.countdownSec);
  }

  function openSingWindow(gen: number, response: SingResponse) {
    capture.begin();
    listeningRef.current = true;
    setStore({ phase: 'listening', countdown: null, waitSecondsLeft: null });
    guard.later(
      gen,
      () => {
        listeningRef.current = false;
        capture.end();
        setStore({ phase: 'evaluating' });
        const result = response.evaluate(capture.frames);
        guard.later(gen, () => showRoundResult(gen, result), EVALUATING_MS);
      },
      response.windowMs
    );
  }

  function showRoundResult(gen: number, result: RoundScore) {
    const s = useEarTrainingStore.getState();
    setStore({
      phase: 'round-result',
      roundResult: result,
      results: [...s.results, result],
      live: { note: null, score: null, outcomes: null },
    });
    const def = defRef.current;
    if (!def) return;
    guard.later(
      gen,
      () => {
        if (useEarTrainingStore.getState().round >= def.rounds) {
          completeSession();
        } else {
          void runRound(gen);
        }
      },
      def.resultMs ?? DEFAULT_RESULT_MS
    );
  }

  async function runRound(gen: number) {
    const def = defRef.current;
    if (!def || !guard.isCurrent(gen)) return;
    // re-verified every round: an OS interruption between rounds can suspend
    // the context, and listening-only sessions have no mic engine to revive it
    try {
      await ensurePlaybackReady({ micHeld: leaseRef.current !== null });
    } catch (err) {
      if (guard.isCurrent(gen)) failSession(friendlyStartupMessage(err));
      return;
    }
    if (!guard.isCurrent(gen)) return;
    const range = promptRange(useProfileStore.getState().profile?.trainingRange ?? null);
    const round = def.makeRound({
      difficulty: difficultyRef.current,
      range,
      previousPc: previousPcRef.current,
    });
    previousPcRef.current = round.answerPc;
    roundsRef.current.push(round);
    currentRoundRef.current = round;
    setStore({
      round: useEarTrainingStore.getState().round + 1,
      instruction: round.instruction,
      roundResult: null,
    });
    await playPrompt(gen, round);
  }

  function completeSession() {
    // free the mic for other features; retry re-acquires it
    void releaseLease();
    const results = useEarTrainingStore.getState().results;
    const summary = summarizeSession(results);
    // only full sessions reach here (exit/unmount/failure reset instead), so
    // every completion is a real attempt worth recording
    const def = defRef.current;
    if (def && results.length > 0) {
      useProgressStore
        .getState()
        .addSession(buildEarSessionRecord(def, difficultyRef.current, roundsRef.current, results, summary));
    }
    setStore({ phase: 'completed', summary });
  }

  /* ---------------------------- controls --------------------------- */

  /** begin a session; difficulty defaults to the exercise's own default */
  async function start(exerciseId: string, difficultyId?: string) {
    const def = exerciseById(exerciseId);
    if (!def) return;
    const gen = freshGeneration();
    player.cancel();
    listeningRef.current = false;
    capture.reset();

    defRef.current = def;
    difficultyRef.current = difficultyId ?? def.defaultDifficulty ?? null;
    roundsRef.current = [];
    currentRoundRef.current = null;
    previousPcRef.current = undefined;
    useEarTrainingStore.getState().reset();
    setStore({
      phase: 'preparing',
      exerciseId: def.id,
      difficultyId: difficultyRef.current,
      totalRounds: def.rounds,
    });

    try {
      if (def.needsMic) {
        await ensureMic(gen);
      } else {
        // listening-only exercise: hand the hardware back
        await releaseLease();
      }
      if (!guard.isCurrent(gen)) return;
      // a round must never begin without working audio output
      await ensurePlaybackReady({ micHeld: def.needsMic });
    } catch (err) {
      if (!guard.isCurrent(gen)) return;
      failSession(friendlyStartupMessage(err));
      return;
    }
    if (!guard.isCurrent(gen)) return;
    void runRound(gen);
  }

  return {
    start,

    /**
     * Replay the current round's prompt. The round restarts cleanly (fresh
     * window, fresh countdown) — replaying can no longer race a pending
     * round-advance timer, which used to double-record results.
     */
    hearAgain() {
      const { phase } = useEarTrainingStore.getState();
      if (phase !== 'listening' && phase !== 'countdown' && phase !== 'waiting') return;
      const round = currentRoundRef.current;
      if (!round) return;
      const gen = freshGeneration();
      void playPrompt(gen, round);
    },

    /** answer button for choice exercises */
    answer(optionId: string) {
      const s = useEarTrainingStore.getState();
      const response = currentRoundRef.current?.response;
      if (s.phase !== 'listening' || !response || response.kind !== 'choice') return;
      const gen = freshGeneration();
      player.cancel();
      showRoundResult(gen, response.evaluate(optionId));
    },

    /** play the correct answer (results screens); index defaults to the latest round */
    replayAnswer(roundIndex?: number) {
      const { phase } = useEarTrainingStore.getState();
      if (phase !== 'completed' && phase !== 'round-result') return;
      const rounds = roundsRef.current;
      const round = rounds[roundIndex ?? rounds.length - 1];
      if (!round) return;
      player.play(round.answerPrompt ?? round.prompt);
    },

    /** run the same exercise again at the same difficulty */
    retry() {
      const { exerciseId, difficultyId } = useEarTrainingStore.getState();
      if (exerciseId) void start(exerciseId, difficultyId ?? undefined);
    },

    /** abandon the session; releases the mic */
    exit() {
      stopEverything();
      useEarTrainingStore.getState().reset();
    },
  };
}
