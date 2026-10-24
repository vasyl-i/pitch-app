import { useEffect, useMemo, useState } from 'react';
import { allTimePracticeSeconds, currentStreak, formatPracticeTime, todayExerciseStats, useProgressStore } from '@/features/progress';
import { useLearningStore, useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement } from '@/features/subscription';
import { useTranslation } from '@/shared/i18n';
import { ensureTodaysLesson } from '../session/lessonFlow';

/** Today's numbers: overall progress, the lesson plan and how far through it the singer is. */
export function useTodayOverview() {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
  const days = useProgressStore((s) => s.days);
  const pitchAccuracy = useLearningStore((s) => s.skills['pitch-accuracy']);
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
      time: formatPracticeTime(allTimePracticeSeconds(totalPracticeSec, days)),
      streak: currentStreak(sessions),
      // the long-term pitch accuracy mastery, the same number the Progress tab
      // shows; null until the skill has been trained (it starts at a neutral 30)
      accuracy: pitchAccuracy.exercisesCompleted > 0 ? pitchAccuracy.mastery : null,
    }),
    // t: re-format the duration after a live language switch
    [sessions, totalPracticeSec, days, pitchAccuracy, t], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const todayStats = useMemo(() => todayExerciseStats(sessions), [sessions]);

  const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
  const allDone = planReady && steps.length > 0 && doneCount === steps.length;

  return { steps, completedSlots, planReady, overall, todayStats, doneCount, allDone };
}
