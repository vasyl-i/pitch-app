import { useMemo } from 'react';
import { categoriesInOrder, exercises, type Exercise } from '@/entities/exercise';
import { EXERCISES } from '@/features/ear-training';
import { CATALOG } from '@/features/learning';
import { bestScores, useProgressStore } from '@/features/progress';
import { useEntitlement, usePaywall, usePremiumStatus } from '@/features/subscription';
import { categoryColors } from '@/shared/theme';

const premiumIds = (kind: 'ear' | 'melody') =>
  new Set(CATALOG.filter((a) => a.kind === kind && a.tier === 'premium').map((a) => a.id));

/**
 * Everything the practice library lists: the ear drills, then the melody
 * exercises grouped by category, each with whether it is locked for this
 * user and its icon colour (one per row, cycling in order down the page).
 */
export function useExerciseLibrary() {
  const sessions = useProgressStore((s) => s.sessions);
  const best = useMemo(() => bestScores(sessions), [sessions]);
  const { isPremium } = usePremiumStatus();
  const advancedUnlocked = useEntitlement('advanced-library');
  const openPaywall = usePaywall('practice-library', 'advanced-library');

  const library = useMemo(() => {
    const premiumEar = premiumIds('ear');
    const premiumMelody = premiumIds('melody');
    let colorIndex = 0;
    const nextColor = () => categoryColors[colorIndex++ % categoryColors.length];

    const drills = EXERCISES.map((drill) => ({ drill, color: nextColor(), locked: !isPremium && premiumEar.has(drill.id) }));

    const byCategory = new Map<string, Exercise[]>();
    for (const e of exercises) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e]);

    const categories = categoriesInOrder().flatMap((meta) => {
      const items = byCategory.get(meta.id) ?? [];
      if (items.length === 0) return [];
      const categoryLocked = meta.tier === 'premium' && !advancedUnlocked;
      return [
        {
          meta,
          allLocked: categoryLocked && items.every((e) => premiumMelody.has(e.id)),
          rows: items.map((exercise) => ({ exercise, color: nextColor(), locked: !isPremium && premiumMelody.has(exercise.id) })),
        },
      ];
    });
    return { drills, categories };
  }, [isPremium, advancedUnlocked]);

  return { ...library, best, isPremium, openPaywall };
}
