/**
 * The exercise category registry — the extension point for practice content.
 *
 * Adding a whole new family of exercises (say, "Riffs & runs" or "Vibrato
 * control") means one entry here plus the exercises themselves. The library
 * screen, the learning catalog, tier gating and the section ordering all read
 * from this registry, so none of them need editing.
 *
 * Tier lives on the *category*, not the exercise: "advanced material is
 * Premium" is a product rule, and pinning it per-exercise is how you end up
 * with one accidentally-free jazz arpeggio.
 *
 * Skill mappings are deliberately absent — those belong to the learning layer
 * (`features/learning/lib/catalog`), which sits above entities and may not be
 * imported from here.
 */

export type ExerciseCategory =
  // ---- free -----------------------------------------------------------
  | 'warmup'
  | 'melody'
  // ---- premium: the advanced practice library --------------------------
  | 'modes'
  | 'jazz'
  | 'chromatic'
  | 'agility'
  | 'belt'
  | 'harmony';

export type ExerciseTier = 'free' | 'premium';

export interface ExerciseCategoryMeta {
  id: ExerciseCategory;
  /** section header in the practice library */
  label: string;
  /** one line on what this family trains */
  tagline: string;
  tier: ExerciseTier;
  /** ascending display order in the library */
  order: number;
}

export const EXERCISE_CATEGORIES: readonly ExerciseCategoryMeta[] = [
  {
    id: 'warmup',
    label: 'Scales, arpeggios & warm-ups',
    tagline: 'Major and minor scales, triads, and gentle range openers.',
    tier: 'free',
    order: 10,
  },
  {
    id: 'melody',
    label: 'Melodies',
    tagline: 'Full tunes to practise pitch and rhythm together.',
    tier: 'free',
    order: 20,
  },
  {
    id: 'modes',
    label: 'Modes',
    tagline: 'Dorian, Lydian and Mixolydian — the colours beyond major and minor.',
    tier: 'premium',
    order: 30,
  },
  {
    id: 'jazz',
    label: 'Jazz & extended chords',
    tagline: 'Sevenths, ninths and the arpeggios that make jazz lines sit right.',
    tier: 'premium',
    order: 40,
  },
  {
    id: 'chromatic',
    label: 'Chromatic exercises',
    tagline: 'Half-step precision — the hardest intervals to pitch cleanly.',
    tier: 'premium',
    order: 50,
  },
  {
    id: 'agility',
    label: 'Agility, runs & melismas',
    tagline: 'Fast passages, riffs and runs that build a flexible voice.',
    tier: 'premium',
    order: 60,
  },
  {
    id: 'belt',
    label: 'Belt & mix voice',
    tagline: 'Power in the upper register, and a smooth path through the break.',
    tier: 'premium',
    order: 70,
  },
  {
    id: 'harmony',
    label: 'Harmony',
    tagline: 'Hold your line while another part moves against it.',
    tier: 'premium',
    order: 80,
  },
];

const BY_ID = new Map(EXERCISE_CATEGORIES.map((c) => [c.id, c]));

export function categoryMeta(id: ExerciseCategory): ExerciseCategoryMeta {
  const meta = BY_ID.get(id);
  if (!meta) throw new Error(`Unknown exercise category: ${id}`);
  return meta;
}

export function categoryTier(id: ExerciseCategory): ExerciseTier {
  return categoryMeta(id).tier;
}

/** categories in display order, optionally limited to one tier */
export function categoriesInOrder(tier?: ExerciseTier): ExerciseCategoryMeta[] {
  return EXERCISE_CATEGORIES.filter((c) => tier === undefined || c.tier === tier).sort((a, b) => a.order - b.order);
}
