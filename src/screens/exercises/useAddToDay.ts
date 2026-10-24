import { useState } from 'react';
import {
  DEFAULT_PREFERENCES,
  usePreferencesStore,
  WEEKDAY_LABELS,
  type WeekdayIndex,
  type WeeklyExerciseEntry,
  type WeeklyPlan,
} from '@/features/learning';
import { useTranslation } from '@/shared/i18n';

/** "Add to plan": which exercise is being placed, the day picker for it, and the confirmation toast */
export function useAddToDay() {
  const { t } = useTranslation();
  const [entry, setEntry] = useState<WeeklyExerciseEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const addToDay = (day: WeekdayIndex) => {
    if (!entry) return;
    const plan: WeeklyPlan = { ...prefs.weeklyPlan };
    plan[day] = [...(plan[day] ?? []), entry];
    setPreferences({ weeklyPlan: plan });
    setEntry(null);
    setToast(t('exercises.addedTo', { day: WEEKDAY_LABELS[day] }));
  };

  return {
    entry,
    weeklyPlan: prefs.weeklyPlan ?? {},
    pick: setEntry,
    cancel: () => setEntry(null),
    addToDay,
    toast,
    clearToast: () => setToast(null),
  };
}
