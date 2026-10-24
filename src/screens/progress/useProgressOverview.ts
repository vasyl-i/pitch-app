import { useMemo } from 'react';
import {
  allTimePracticeSeconds,
  currentStreak,
  formatTotalPracticeTime,
  historyTotals,
  isoDay,
  isoDayStart,
  shiftDay,
  useProgressStore,
} from '@/features/progress';
import {
  ALL_SKILLS,
  buildWeeklyReview,
  masteryAsOf,
  useLearningStore,
  usePreferencesStore,
  weekKeyOf,
  type SkillId,
} from '@/features/learning';
import { formatNumber, useTranslation } from '@/shared/i18n';

/**
 * Everything the Progress tab shows.
 *
 * - Skill tiles are long-term mastery (0–100), the same number the mastery
 *   rows and the journey use — "—" until the skill has been trained, rather
 *   than the neutral 30 every skill starts from.
 * - Perfect notes, days and time are all-time totals from the day history,
 *   which outlives the capped session list.
 * - "Last 7 days" is today and the six days before it, compared with
 *   mastery at the close of the day before — rolling, so it never empties
 *   out on a Monday.
 */
export function useProgressOverview() {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const days = useProgressStore((s) => s.days);
  const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const masteryHistory = useLearningStore((s) => s.masteryHistory);
  const weeklyFocus = useLearningStore((s) => s.weeklyFocus);
  const prefs = usePreferencesStore((s) => s.preferences);

  // t: re-format the translated strings after a live language switch
  const tiles = useMemo(() => {
    const totals = historyTotals(days);
    const mastery = (skill: SkillId) => (skills[skill].exercisesCompleted > 0 ? `${skills[skill].mastery}%` : '—');
    return {
      pitchAccuracy: mastery('pitch-accuracy'),
      rhythm: mastery('rhythm-accuracy'),
      pitchStability: mastery('pitch-stability'),
      perfectNotes: formatNumber(totals.perfectNotes),
      daysPracticed: totals.daysPracticed > 0 ? t('common.daysShort', { count: totals.daysPracticed }) : '—',
      practiceTime: formatTotalPracticeTime(allTimePracticeSeconds(totalPracticeSec, days)),
    };
  }, [days, skills, totalPracticeSec, t]);

  const calendarDays = useMemo(
    () => new Set(Object.values(days).filter((d) => d.sessions > 0).map((d) => d.day)),
    [days],
  );

  const report = useMemo(() => {
    const now = Date.now();
    const windowStart = shiftDay(now, -6);
    const today = isoDay(now);
    const inWindow = Object.values(days).filter((d) => d.day >= windowStart && d.day <= today);
    const since = isoDayStart(windowStart);
    return buildWeeklyReview({
      weekKey: weekKeyOf(now),
      focus: weeklyFocus?.skill ?? null,
      skills,
      startOfWeekMastery: masteryAsOf(masteryHistory, shiftDay(now, -7), [...ALL_SKILLS]),
      annotations: annotations.filter((a) => a.sessionAt >= since),
      daysPracticed: inWindow.filter((d) => d.sessions > 0).length,
      sessions: inWindow.reduce((sum, d) => sum + d.sessions, 0),
      practiceSeconds: inWindow.reduce((sum, d) => sum + d.practiceSec, 0),
      streak: currentStreak(sessions, now),
      prefs,
    });
  }, [days, sessions, skills, annotations, masteryHistory, weeklyFocus, prefs, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return { hasSessions: sessions.length > 0 || calendarDays.size > 0, tiles, calendarDays, report };
}
