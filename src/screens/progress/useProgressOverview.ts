import { useMemo } from 'react';
import {
  formatPracticeTime,
  localDayKey,
  perfectExercises,
  practicedDayKeys,
  totalPracticeDays,
  totalPracticeSeconds,
  useProgressStore,
  weeklyAccuracyTrend,
  weeklyStats,
} from '@/features/progress';
import { buildSessionInsights, useLearningStore } from '@/features/learning';
import { useTranslation } from '@/shared/i18n';

/** Everything the Progress tab shows, derived from the session history and the learning model. */
export function useProgressOverview() {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const weekSnapshots = useLearningStore((s) => s.weekSnapshots);

  const week = useMemo(() => weeklyStats(sessions), [sessions]);
  const trend = useMemo(() => weeklyAccuracyTrend(sessions), [sessions]);
  const perfectCount = useMemo(() => perfectExercises(sessions).length, [sessions]);
  const practiceDays = useMemo(() => totalPracticeDays(sessions), [sessions]);
  const calendarDays = useMemo(() => practicedDayKeys(sessions), [sessions]);
  // t: re-format the translated strings after a live language switch
  const practiceTime = useMemo(() => formatPracticeTime(totalPracticeSeconds(sessions)), [sessions, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const insights = useMemo(() => {
    const today = localDayKey(Date.now());
    const todays = annotations.filter((a) => localDayKey(a.sessionAt) === today);
    return buildSessionInsights(annotations[0] ?? null, todays, skills);
  }, [annotations, skills, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    hasSessions: sessions.length > 0,
    week,
    trend,
    perfectCount,
    practiceDays,
    practiceTime,
    calendarDays,
    insights,
    weekSnapshots,
  };
}
