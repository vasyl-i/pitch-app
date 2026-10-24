import { useMemo, useState } from 'react';
import { categoriesInOrder, exercises, type Exercise } from '@/entities/exercise';
import { EXERCISES } from '@/features/ear-training';
import {
  CATALOG,
  DEFAULT_PREFERENCES,
  usePreferencesStore,
  type WeekdayIndex,
  type WeeklyExerciseEntry,
  type WeeklyPlan,
} from '@/features/learning';
import { categoryColors } from '@/shared/theme';

export const MAX_PER_DAY = 15;

const MINUTES = new Map(CATALOG.map((a) => [a.id, a.minutes]));

/**
 * The picker's state: the search, the exercises matching it (ear drills, then
 * melodies by category, each with its icon colour and how many times it is
 * already on this day), and adding one — up to fifteen a day.
 */
export function useExercisePicker(day: WeekdayIndex) {
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const weeklyPlan: WeeklyPlan = prefs.weeklyPlan ?? {};
  const dayEntries = weeklyPlan[day] ?? [];
  const atLimit = dayEntries.length >= MAX_PER_DAY;

  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const addedCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of dayEntries) map.set(e.activityId, (map.get(e.activityId) ?? 0) + 1);
    return map;
  }, [dayEntries]);

  const { drills, categories } = useMemo(() => {
    const matches = (title: string) => !query || title.toLowerCase().includes(query);
    let colorIndex = 0;
    const nextColor = () => categoryColors[colorIndex++ % categoryColors.length];

    const drills = EXERCISES.filter((d) => matches(d.title)).map((drill) => ({ drill, color: nextColor(), minutes: MINUTES.get(drill.id) ?? 2 }));

    const byCategory = new Map<string, Exercise[]>();
    for (const e of exercises) if (matches(e.title)) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e]);
    const categories = categoriesInOrder().flatMap((meta) => {
      const items = byCategory.get(meta.id) ?? [];
      return items.length === 0
        ? []
        : [{ meta, rows: items.map((exercise) => ({ exercise, color: nextColor(), minutes: MINUTES.get(exercise.id) ?? 3 })) }];
    });
    return { drills, categories };
  }, [query]);

  const add = (entry: WeeklyExerciseEntry) => {
    if (atLimit) return;
    setPreferences({ weeklyPlan: { ...weeklyPlan, [day]: [...dayEntries, entry] } });
  };

  return { search, setSearch, drills, categories, addedCounts, atLimit, add, count: dayEntries.length };
}
