import { useMemo } from 'react';
import { categoriesInOrder, exercises, offeredIn, type Exercise } from '@/entities/exercise';
import { EXERCISES, type ExerciseDefinition } from '@/features/ear-training';
import { CATALOG } from '@/features/learning';
import { bestScores, useProgressStore } from '@/features/progress';
import { useEntitlement, usePaywall, usePremiumStatus } from '@/features/subscription';
import { categoryColors } from '@/shared/theme';

export type LibraryItem =
  | { kind: 'drill'; id: string; drill: ExerciseDefinition; color: string; locked: boolean }
  | { kind: 'melody'; id: string; exercise: Exercise; color: string; locked: boolean };

export interface LibrarySection {
  key: string;
  label: string;
  tagline?: string;
  /** every row in it is Premium and locked — the header carries the badge */
  allLocked: boolean;
  data: LibraryItem[];
}

const premiumIds = (kind: 'ear' | 'melody') =>
  new Set(CATALOG.filter((a) => a.kind === kind && a.tier === 'premium').map((a) => a.id));

/**
 * Everything the practice library lists, as list sections: the ear drills,
 * then the melody exercises grouped by category, each row with whether it is
 * locked for this user and its icon colour (one per row, cycling in order
 * down the page).
 */
export function useExerciseLibrary(drillsLabel: string) {
  const sessions = useProgressStore((s) => s.sessions);
  const best = useMemo(() => bestScores(sessions), [sessions]);
  const { isPremium } = usePremiumStatus();
  const advancedUnlocked = useEntitlement('advanced-library');
  const openPaywall = usePaywall('practice-library', 'advanced-library');

  const library = useMemo((): LibrarySection[] => {
    const premiumEar = premiumIds('ear');
    const premiumMelody = premiumIds('melody');
    let colorIndex = 0;
    const nextColor = () => categoryColors[colorIndex++ % categoryColors.length];

    const drills: LibrarySection = {
      key: 'ear-drills',
      label: drillsLabel,
      allLocked: false,
      data: EXERCISES.map((drill) => ({
        kind: 'drill',
        id: `ear:${drill.id}`,
        drill,
        color: nextColor(),
        locked: !isPremium && premiumEar.has(drill.id),
      })),
    };

    const byCategory = new Map<string, Exercise[]>();
    // some songs are offered in one UI language only
    for (const e of exercises) if (offeredIn(e)) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e]);

    const categories = categoriesInOrder().flatMap((meta): LibrarySection[] => {
      const items = byCategory.get(meta.id) ?? [];
      if (items.length === 0) return [];
      const categoryLocked = meta.tier === 'premium' && !advancedUnlocked;
      return [
        {
          key: meta.id,
          label: meta.label,
          tagline: meta.tagline,
          allLocked: categoryLocked && items.every((e) => premiumMelody.has(e.id)),
          data: items.map((exercise) => ({
            kind: 'melody',
            id: exercise.id,
            exercise,
            color: nextColor(),
            locked: !isPremium && premiumMelody.has(exercise.id),
          })),
        },
      ];
    });
    return [drills, ...categories];
  // drillsLabel is translated, so the list also rebuilds on a language switch
  }, [isPremium, advancedUnlocked, drillsLabel]);

  return { sections: library, best, isPremium, openPaywall };
}
