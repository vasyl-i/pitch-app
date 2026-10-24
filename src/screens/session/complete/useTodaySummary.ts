import { useMemo } from 'react';
import { currentStreak, formatPracticeTime, localDayKey, useProgressStore } from '@/features/progress';

/** today's practice so far: sessions, time, and the streak it extends */
export function useTodaySummary() {
  const sessions = useProgressStore((s) => s.sessions);
  return useMemo(() => {
    const key = localDayKey(Date.now());
    const todays = sessions.filter((s) => localDayKey(s.at) === key);
    return {
      count: todays.length,
      time: formatPracticeTime(todays.reduce((sum, s) => sum + (s.durationSec ?? 0), 0)),
      streak: currentStreak(sessions),
    };
  }, [sessions]);
}
