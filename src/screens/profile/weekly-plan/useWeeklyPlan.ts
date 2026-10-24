import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  canRemoveExercise,
  generateDefaultWeeklyPlan,
  jsDateToWeekdayIndex,
  useLessonSessionStore,
  usePreferencesStore,
  weeklyPlanFromSteps,
  type WeekdayIndex,
  type WeeklyPlan,
} from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { t } from '@/shared/i18n';

const ALL_DAYS: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * The weekly plan and its editing: which day is open, and removing an
 * exercise (refused when it would take the day under the five-minute floor).
 */
export function useWeeklyPlan() {
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const { isPremium } = usePremiumStatus();
  const lessonSteps = useLessonSessionStore((s) => s.steps);
  const weeklyPlan: WeeklyPlan = prefs.weeklyPlan ?? {};
  const [expanded, setExpanded] = useState<WeekdayIndex | null>(null);

  // A user without a full plan (an existing user who skipped the updated
  // onboarding, or most days empty) gets one generated, with today matching
  // what "Today's plan" already shows.
  useEffect(() => {
    const existing = prefs.weeklyPlan;
    const filledDays = existing ? ALL_DAYS.filter((d) => (existing[d]?.length ?? 0) > 0).length : 0;
    if (existing && filledDays === 7) return;
    const plan = generateDefaultWeeklyPlan(prefs.dailyMinutes, isPremium ? 'premium' : 'free');
    if (lessonSteps.length > 0) {
      const today = jsDateToWeekdayIndex(new Date());
      plan[today] = weeklyPlanFromSteps(lessonSteps)[today];
    }
    setPreferences({ weeklyPlan: plan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDay = (day: WeekdayIndex) => setExpanded((prev) => (prev === day ? null : day));

  const removeExercise = (day: WeekdayIndex, index: number) => {
    const entries = weeklyPlan[day] ?? [];
    if (!canRemoveExercise(entries, index)) {
      Alert.alert(t('profile.weekly.minTitle'), t('profile.weekly.minMessage'));
      return;
    }
    const updated = entries.filter((_, i) => i !== index);
    const next = { ...weeklyPlan };
    if (updated.length === 0) delete next[day];
    else next[day] = updated;
    setPreferences({ weeklyPlan: next });
  };

  return { weeklyPlan, expanded, toggleDay, removeExercise };
}
