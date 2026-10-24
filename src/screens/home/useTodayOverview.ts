import { useEffect, useMemo, useState } from 'react';
import { currentStreak, formatPracticeTime, singingAccuracy, todayExerciseStats, useProgressStore } from '@/features/progress';
import { useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement } from '@/features/subscription';
import { useTranslation } from '@/shared/i18n';
import { ensureTodaysLesson } from '../session/lessonFlow';

/** Today's numbers: overall progress, the lesson plan and how far through it the singer is. */
export function useTodayOverview() {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
  const prefs = usePreferencesStore((s) => s.preferences);
  const adaptive = useEntitlement('adaptive-lessons');
  const steps = useLessonSessionStore((s) => s.steps);
  const completedSlots = useLessonSessionStore((s) => s.completedSlots);

  const [planReady, setPlanReady] = useState(false);
  useEffect(() => {
    ensureTodaysLesson(() => setPlanReady(true));
  }, [prefs, adaptive]);

  const overall = useMemo(
    () => ({
      time: formatPracticeTime(totalPracticeSec),
      streak: currentStreak(sessions),
      // sung attempts only: listening drills score recognition, not pitch
      accuracy: singingAccuracy(sessions) ?? 0,
    }),
    // t: re-format the duration after a live language switch
    [sessions, totalPracticeSec, t], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const todayStats = useMemo(() => todayExerciseStats(sessions), [sessions]);

  const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
  const allDone = planReady && steps.length > 0 && doneCount === steps.length;

  return { steps, completedSlots, planReady, overall, todayStats, doneCount, allDone };
}
