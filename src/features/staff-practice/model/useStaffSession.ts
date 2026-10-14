/**
 * React wiring for a staff-practice run.
 *
 * The run itself — the three stages, the handovers, the vocal onset, grading,
 * the silent-room timeout — lives in `runController`, which is plain and
 * testable. This hook only owns what React owns: building the three players,
 * tracking the output route, holding the mic lease for the screen's lifetime,
 * and tearing everything down on unmount.
 */
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { AudioManager } from 'react-native-audio-api';
import { categoryRepeats, type Exercise } from '@/entities/exercise';
import { recordObservedNote } from '@/entities/profile';
import { acquireMic, micSettled, MicPermissionError, type MicLease } from '@/features/pitch-detection';
import { micActive, micGlowTier } from '@/shared/lib/micRmsBus';
import { hapticMicReady } from '@/shared/audio';
import { audioContext, audioNow, createToneGroup, watchOutputRoute } from '@/shared/audio';
import { createMelodyPlayer } from '../lib/melodyPlayer';
import { createRunController, type RunStage } from './runController';
import { useStaffStore } from './staffStore';

export interface StaffSessionControls {
  restart: () => void;
  /** jump from the listen (preview) stage straight to singing */
  skipListen: () => void;
}

/** the starting-note cue: a beat after the "your turn" card fades in */
const CUE_DELAY_SEC = 0.25;
/** long enough to lock onto, short enough to be gone well before the mic opens */
const CUE_DURATION_SEC = 0.9;

/**
 * Whether the "your turn" card sounds the first note. Scales and arpeggios
 * move to a new key every round, so the singer needs to hear where this one
 * starts; a song is sung in the key just heard.
 */
export function cuesStartingNote(exercise: Exercise): boolean {
  return categoryRepeats(exercise.category) === 'ladder';
}

export function useStaffSession(exercise: Exercise, rate = 1): StaffSessionControls {
  const restartRef = useRef<() => void>(() => {});
  const skipListenRef = useRef<() => void>(() => {});

  useEffect(() => {
    const store = useStaffStore.getState();
    store.reset();
    store.setStatus('loading');

    let lease: MicLease | null = null;
    let disposed = false;

    /**
     * Whether the app's output is currently inaudible to the microphone.
     *
     * No longer decides whether anything plays — the accompaniment is always
     * audible. It drives the screen's headphone hint only: on the built-in
     * speaker the mic hears the guide, so the assisted stage's score is
     * inflated, and the singer deserves to be told the cheap way to avoid it.
     */
    const unwatchRoute = watchOutputRoute((isPrivate) => {
      useStaffStore.getState().setOutputIsolated(isPrivate);
    });

    // Three timelines over one exercise, differing only in what they sound.
    //
    //   demo          — audible; grades nothing, so it gates the mic freely.
    //   accompaniment — audible, and deliberately *not* gating: stage 2 is a
    //                   sing-along, so playback and capture must overlap. See
    //                   `gatesMicrophone` for what that costs on a speaker.
    //   solo          — schedules nothing, ever. The unaided pass has no
    //                   oscillator to leak from at all.
    const demo = createMelodyPlayer(exercise.notes, () => controller.referenceFinished(), { rate });
    const accompaniment = createMelodyPlayer(exercise.notes, () => controller.accompanimentFinished(), {
      rate,
      volume: 0.85,
      gatesMicrophone: false,
    });
    const solo = createMelodyPlayer(exercise.notes, () => controller.phraseFinished(), {
      rate,
      silent: true,
    });

    const cue = createToneGroup();
    const firstNote = exercise.notes[0];
    const cueSolo = cuesStartingNote(exercise) && firstNote
      ? () => {
          cue.cancel();
          cue.schedule({ midi: firstNote.midi, at: audioNow() + CUE_DELAY_SEC, duration: CUE_DURATION_SEC, volume: 0.55 });
        }
      : undefined;

    // Declared early so closures below can reference it; assigned after creation.
    let controller: ReturnType<typeof createRunController>;

    /** Release the mic lease so the audio session can switch to playback. */
    const releaseLease = async () => {
      if (!lease) return;
      // cleared before the await, so a restart racing the release acquires a
      // fresh lease instead of trusting the one being torn down
      const releasing = lease;
      lease = null;
      micActive.value = false;
      await releasing.release();
    };

    /** Acquire the mic for recording stages. */
    const acquireLease = async () => {
      if (lease || disposed) return;
      lease = await acquireMic({ onFrame: controller.onFrame });
      if (disposed) {
        void lease.release();
        lease = null;
        return;
      }
      micActive.value = true;
      hapticMicReady();
    };

    /**
     * Before the listen (demo) stage, release the mic and switch to playback
     * category so iOS plays audio at full volume. Before accompanied/solo,
     * re-acquire the mic — pitchEngine will set playAndRecord back.
     */
    const onBeforeStage = async (nextStage: RunStage) => {
      if (disposed) return;
      if (nextStage === 'listen') {
        await releaseLease();
        await micSettled();
        // Switch to playback category for full-volume demo
        AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default' });
        await AudioManager.setAudioSessionActivity(true);
        const ctx = audioContext();
        if (ctx.state === 'suspended') await ctx.resume();
      } else if (nextStage === 'accompanied' || nextStage === 'solo') {
        if (!lease) await acquireLease();
      }
    };

    controller = createRunController({
      exercise,
      demo,
      accompaniment,
      solo,
      store: {
        reset: () => useStaffStore.getState().reset(),
        clearStageFeedback: () => useStaffStore.getState().clearStageFeedback(),
        setStatus: (status) => {
          useStaffStore.getState().setStatus(status);
          if (status === 'no-input' || status === 'error') void releaseLease();
        },
        setPlayback: (patch) => useStaffStore.getState().setPlayback(patch),
        setPitch: (patch) => useStaffStore.getState().setPitch(patch),
        addResult: (result) => useStaffStore.getState().addResult(result),
        setAccompaniedSummary: (summary) => useStaffStore.getState().setAccompaniedSummary(summary),
        setSummary: (summary, comparison) => {
          useStaffStore.getState().setSummary(summary, comparison);
          // the run is over: free the mic now rather than when the screen
          // unmounts, which a "Continue" replace only does after the next
          // exercise has already started sounding its prompt
          void releaseLease();
        },
      },
      onWellSungNote: recordObservedNote,
      onBeforeStage,
      cueSolo,
    });

    const begin = async () => {
      try {
        // a mic release still landing (the previous exercise, or the previous
        // key of a guided scale) would switch the session off under the preview
        await micSettled();
        if (disposed) return;
        // Don't acquire mic yet — the demo stage doesn't need it.
        // Switch to playback category for full-volume demo playback.
        AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default' });
        await AudioManager.setAudioSessionActivity(true);
        const ctx = audioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        if (disposed) return;
        controller.startRun();
      } catch (err: unknown) {
        if (disposed) return;
        if (err instanceof MicPermissionError) {
          useStaffStore.getState().setError('Microphone access is required. Enable it in Settings and try again.');
        } else {
          useStaffStore.getState().setError(err instanceof Error ? err.message : 'Could not start');
        }
      }
    };

    restartRef.current = () => {
      cue.cancel();
      controller.startRun();
    };
    skipListenRef.current = () => controller.skipListen();

    // Defer mic acquisition until the screen transition animation finishes —
    // AudioRecorder creation and audio session setup are heavy native calls
    // that block the JS thread and cause the slide-in to stutter.
    const task = InteractionManager.runAfterInteractions(() => {
      void begin();
    });

    return () => {
      task.cancel();
      disposed = true;
      unwatchRoute();
      controller.dispose();
      cue.cancel();
      demo.dispose();
      accompaniment.dispose();
      solo.dispose();
      void lease?.release();
      micActive.value = false;
      micGlowTier.value = 0;
      useStaffStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, rate]);

  return { restart: () => restartRef.current(), skipListen: () => skipListenRef.current() };
}
