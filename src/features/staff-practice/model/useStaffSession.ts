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
import type { Exercise } from '@/entities/exercise';
import { recordObservedNote } from '@/entities/profile';
import { acquireMic, MicPermissionError, type MicLease } from '@/features/pitch-detection';
import { micActive } from '@/shared/lib/micRmsBus';
import { watchOutputRoute } from '@/shared/audio';
import { createMelodyPlayer } from '../lib/melodyPlayer';
import { createRunController } from './runController';
import { useStaffStore } from './staffStore';

export interface StaffSessionControls {
  restart: () => void;
}

export function useStaffSession(exercise: Exercise, rate = 1): StaffSessionControls {
  const restartRef = useRef<() => void>(() => {});

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
      gatesMicrophone: false,
    });
    const solo = createMelodyPlayer(exercise.notes, () => controller.phraseFinished(), {
      rate,
      silent: true,
      leadIn: 0,
    });

    const controller = createRunController({
      exercise,
      demo,
      accompaniment,
      solo,
      store: {
        reset: () => useStaffStore.getState().reset(),
        clearStageFeedback: () => useStaffStore.getState().clearStageFeedback(),
        setStatus: (status) => useStaffStore.getState().setStatus(status),
        setPlayback: (patch) => useStaffStore.getState().setPlayback(patch),
        setPitch: (patch) => useStaffStore.getState().setPitch(patch),
        addResult: (result) => useStaffStore.getState().addResult(result),
        setAccompaniedSummary: (summary) => useStaffStore.getState().setAccompaniedSummary(summary),
        setSummary: (summary, comparison) => useStaffStore.getState().setSummary(summary, comparison),
      },
      // feed smart range-learning: a comfortably-sung note outside the stored
      // comfort range, sustained through most of its duration
      onWellSungNote: recordObservedNote,
    });

    const begin = async () => {
      try {
        lease = await acquireMic({ onFrame: controller.onFrame });
        if (disposed) {
          void lease.release();
          return;
        }
        micActive.value = true;
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

    restartRef.current = () => controller.startRun();

    void begin();

    return () => {
      disposed = true;
      unwatchRoute();
      controller.dispose();
      demo.dispose();
      accompaniment.dispose();
      solo.dispose();
      void lease?.release();
      micActive.value = false;
      useStaffStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, rate]);

  return { restart: () => restartRef.current() };
}
