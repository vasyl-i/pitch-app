import { useMemo } from 'react';
import { buildWeeklyReview, useLearningStore, usePreferencesStore, weekKeyOf } from '@/features/learning';
import { currentStreak, localDayKey, useProgressStore } from '@/features/progress';

/** this week's report, Monday to now, from progress history and the learning profile */
export function useWeeklyReport() {
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const weeklyFocus = useLearningStore((s) => s.weeklyFocus);
  const weekSnapshots = useLearningStore((s) => s.weekSnapshots);
  const prefs = usePreferencesStore((s) => s.preferences);

  return useMemo(() => {
    const weekKey = weekKeyOf(Date.now());
    // weekKey encodes the week's Monday
    const [y, m, d] = weekKey.split('-').map(Number);
    const weekStart = new Date(y, m, d).getTime();
    const thisWeek = sessions.filter((s) => s.at >= weekStart);
    return buildWeeklyReview({
      weekKey,
      focus: weeklyFocus?.skill ?? null,
      skills,
      startOfWeekMastery: weekSnapshots.find((w) => w.weekKey === weekKey)?.mastery ?? null,
      annotations: annotations.filter((a) => a.sessionAt >= weekStart),
      daysPracticed: new Set(thisWeek.map((s) => localDayKey(s.at))).size,
      sessions: thisWeek.length,
      practiceSeconds: thisWeek.reduce((sum, s) => sum + (s.durationSec ?? 0), 0),
      streak: currentStreak(sessions),
      prefs,
    });
  }, [sessions, skills, annotations, weeklyFocus, weekSnapshots, prefs]);
}
