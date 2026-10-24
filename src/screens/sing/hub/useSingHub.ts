import { useEffect, useMemo, useState } from 'react';
import { FOCUS_TITLES, buildCoachMessage, nextGuidedStep, useLearningStore, useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { currentStreak, formatPracticeTime, localDayKey, noteHeatmap, totalPracticeSeconds, useProgressStore } from '@/features/progress';
import { useEntitlement } from '@/features/subscription';
import { useTranslation } from '@/shared/i18n';
import { ensureTodaysLesson } from '../../session/lessonFlow';

/** Everything the Sing hub shows: today's plan and stats, this week's focus, and the coach's note. */
export function useSingHub() {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const weeklyFocus = useLearningStore((s) => s.weeklyFocus);
  const prefs = usePreferencesStore((s) => s.preferences);
  const adaptive = useEntitlement('adaptive-lessons');
  const steps = useLessonSessionStore((s) => s.steps);
  const completedSlots = useLessonSessionStore((s) => s.completedSlots);

  // snapshot today's plan once all persisted stores are hydrated; `adaptive`
  // is a dependency because upgrading must rebuild today's plan immediately
  // (see `planKey` in lessonFlow)
  const [planReady, setPlanReady] = useState(false);
  useEffect(() => {
    ensureTodaysLesson(() => setPlanReady(true));
  }, [prefs, adaptive]);

  const streak = useMemo(() => currentStreak(sessions), [sessions]);
  const coach = useMemo(() => buildCoachMessage(skills, noteHeatmap(sessions), annotations), [skills, sessions, annotations]);
  const todayStats = useMemo(() => {
    const todayKey = localDayKey(Date.now());
    const todays = sessions.filter((s) => localDayKey(s.at) === todayKey);
    const accuracy = todays.length > 0 ? Math.round(todays.reduce((sum, s) => sum + s.score, 0) / todays.length) : null;
    return { accuracy, practiceLabel: formatPracticeTime(totalPracticeSeconds(todays)) };
  }, [sessions]);

  /**
   * A real, measured line for the locked coach card — never a mock-up. If the
   * history doesn't yet support a specific claim this stays undefined and the
   * card simply omits the preview, because a fabricated "insight" on a paywall
   * is a promise the product then has to keep.
   */
  const coachTeaser = useMemo(() => {
    const strongest = noteHeatmap(sessions)
      .filter((n) => n.count >= 5 && Math.abs(n.avgCents) >= 20)
      .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents))[0];
    if (!strongest) return undefined;
    const params = { note: strongest.name, cents: Math.round(Math.abs(strongest.avgCents)) };
    return strongest.avgCents > 0 ? t('sing.hub.coachTeaserSharp', params) : t('sing.hub.coachTeaserFlat', params);
  }, [sessions, t]);

  const next = planReady ? nextGuidedStep({ steps, completedSlots }) : null;

  return {
    hasPrefs: !!prefs,
    steps,
    completedSlots,
    planReady,
    doneCount: steps.filter((s) => completedSlots.includes(s.slot)).length,
    allDone: planReady && steps.length > 0 && next === null,
    streak,
    coach,
    coachTeaser,
    todayStats,
    heroTitle: adaptive && weeklyFocus ? FOCUS_TITLES[weeklyFocus.skill] : t('sing.hub.heroTitle'),
  };
}
