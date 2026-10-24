import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useEarTrainingSession } from '@/features/ear-training';
import { useLessonSessionStore } from '@/features/learning';

/**
 * Starts the drill once the screen has settled — resuming a guided step's
 * partial progress, for as many rounds as today's plan fitted — and on exit
 * keeps the rounds already done for a guided step.
 */
export function useEarSessionRunner(exerciseId: string, difficultyId: string | undefined, guided: boolean | undefined, goBack: () => void) {
  const session = useEarTrainingSession();
  const activeSlot = useLessonSessionStore((s) => s.activeSlot);
  // a guided step runs as many rounds as today's plan fitted to the time budget
  const [rounds] = useState(() => (guided ? useLessonSessionStore.getState().steps.find((s) => s.slot === activeSlot)?.totalRounds : undefined));
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // captured once on mount so resume state isn't lost
  const partialRef = useRef(activeSlot ? useLessonSessionStore.getState().partialProgress[activeSlot] : undefined);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void sessionRef.current.start(exerciseId, difficultyId, partialRef.current, rounds);
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, difficultyId]);

  const exit = useCallback(() => {
    if (guided && activeSlot) {
      const progress = sessionRef.current.getProgress();
      if (progress && progress.completedRounds > 0) useLessonSessionStore.getState().savePartial(activeSlot, progress);
    }
    sessionRef.current.exit();
    goBack();
  }, [guided, activeSlot, goBack]);

  const restart = () => void session.start(exerciseId, difficultyId, undefined, rounds);

  return { session, exit, restart };
}
