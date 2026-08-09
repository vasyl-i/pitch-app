/**
 * The activity catalog: every launchable unit of practice the learning
 * platform can put in a lesson, recommend, or hang on the skill tree.
 *
 * Ear-training entries mirror `features/ear-training/model/definitions.ts` by
 * id and difficulty-tier id only — importing the definitions themselves would
 * drag the audio player into this pure layer. The ids are stable public
 * contracts; if a drill gains a tier, add it here too.
 *
 * Melody entries are generated from the exercise library, so new library
 * melodies join the platform automatically — including whole new *categories*,
 * which need only a `CATEGORY_PROFILE` entry to become lesson-eligible.
 * (Relative imports rather than the `@/` alias so the whole lib layer runs
 * under plain `node --test`.)
 */
import { categoryTier } from '../../../entities/exercise/categories';
import type { ExerciseCategory } from '../../../entities/exercise/categories';
import { exercises as melodyLibrary } from '../../../entities/exercise/library';
import type { Activity, SkillId } from '../model/types';

const EAR_ACTIVITIES: Activity[] = [
  {
    kind: 'ear',
    id: 'note-echo',
    title: 'Echo the note',
    tier: 'free',
    skills: ['pitch-accuracy', 'pitch-memory'],
    difficulties: null,
    minutes: 2,
    challenge: 0.15,
  },
  {
    kind: 'ear',
    id: 'major-minor',
    title: 'Major or minor?',
    tier: 'free',
    skills: ['chord-recognition'],
    difficulties: null,
    minutes: 2,
    challenge: 0.2,
  },
  {
    kind: 'ear',
    id: 'melody-echo',
    title: 'Echo the melody',
    tier: 'free',
    skills: ['melody-reproduction', 'musical-memory', 'rhythm-memory'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    minutes: 3,
    challenge: 0.35,
  },
  {
    kind: 'ear',
    id: 'pitch-memory',
    title: 'Pitch memory',
    tier: 'free',
    skills: ['pitch-memory', 'musical-memory'],
    difficulties: ['easy', 'medium', 'hard', 'expert'],
    minutes: 3,
    challenge: 0.35,
  },
  {
    kind: 'ear',
    id: 'odd-one-out',
    title: 'Odd one out',
    tier: 'free',
    skills: ['interval-recognition', 'chord-recognition'],
    difficulties: ['intervals', 'chords', 'scales'],
    minutes: 3,
    challenge: 0.4,
  },
  {
    kind: 'ear',
    id: 'finish-melody',
    title: 'Finish the melody',
    tier: 'free',
    skills: ['musical-memory', 'interval-singing'],
    difficulties: null,
    minutes: 2,
    challenge: 0.4,
  },
  {
    kind: 'ear',
    id: 'echo-interval',
    title: 'Echo the interval',
    tier: 'free',
    skills: ['interval-recognition', 'melody-reproduction'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    minutes: 3,
    challenge: 0.35,
  },
  {
    kind: 'ear',
    id: 'sing-interval',
    title: 'Sing the interval',
    tier: 'free',
    skills: ['interval-singing', 'interval-recognition'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    minutes: 3,
    challenge: 0.5,
  },
  {
    kind: 'ear',
    id: 'chord-tones',
    title: 'Chord tones',
    tier: 'free',
    skills: ['chord-singing', 'chord-recognition', 'interval-singing'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    minutes: 3,
    challenge: 0.6,
  },
];

/**
 * How each melody category behaves as practice: which skills it trains
 * (primary first — that drives need-scoring and difficulty), how long a pass
 * takes, and a floor on intrinsic challenge.
 *
 * This is the single place a new exercise category has to touch to become a
 * full citizen of the platform: lessons, recommendations, weak-spot training
 * and the skill tree all read the catalog.
 */
const CATEGORY_PROFILE: Record<ExerciseCategory, { skills: SkillId[]; minutes: number; minChallenge: number }> = {
  warmup: {
    skills: ['voice-control', 'pitch-stability', 'pitch-accuracy', 'sight-singing'],
    minutes: 2,
    minChallenge: 0,
  },
  melody: {
    skills: ['melody-reproduction', 'pitch-accuracy', 'rhythm-accuracy', 'sight-singing'],
    minutes: 3,
    minChallenge: 0,
  },
  modes: {
    skills: ['sight-singing', 'pitch-accuracy', 'interval-singing', 'musical-memory'],
    minutes: 3,
    minChallenge: 0.55,
  },
  jazz: {
    skills: ['chord-singing', 'interval-singing', 'pitch-accuracy'],
    minutes: 3,
    minChallenge: 0.6,
  },
  chromatic: {
    skills: ['pitch-accuracy', 'interval-singing', 'pitch-stability'],
    minutes: 3,
    minChallenge: 0.7,
  },
  agility: {
    skills: ['voice-control', 'rhythm-accuracy', 'melody-reproduction', 'pitch-accuracy'],
    minutes: 3,
    minChallenge: 0.75,
  },
  belt: {
    skills: ['voice-control', 'pitch-stability', 'pitch-accuracy'],
    minutes: 4,
    minChallenge: 0.8,
  },
  harmony: {
    skills: ['pitch-stability', 'chord-singing', 'pitch-accuracy'],
    minutes: 3,
    minChallenge: 0.7,
  },
};

const DIFFICULTY_CHALLENGE: Record<string, number> = { easy: 0.2, medium: 0.4, hard: 0.6 };

const MELODY_ACTIVITIES: Activity[] = melodyLibrary.map((e) => {
  const profile = CATEGORY_PROFILE[e.category];
  return {
    kind: 'melody',
    id: e.id,
    title: e.title,
    tier: categoryTier(e.category),
    skills: profile.skills,
    difficulties: null,
    minutes: profile.minutes,
    challenge: Math.max(profile.minChallenge, DIFFICULTY_CHALLENGE[e.difficulty] ?? 0.4),
  };
});

export const CATALOG: Activity[] = [...EAR_ACTIVITIES, ...MELODY_ACTIVITIES];

/** everything a free user can actually open */
export const FREE_CATALOG: Activity[] = CATALOG.filter((a) => a.tier === 'free');

/**
 * The catalog a given user may be recommended from. Generators take this
 * rather than reaching for entitlements themselves, which keeps the whole lib
 * layer pure and makes "what would a Premium plan look like?" trivially
 * previewable by passing the other tier.
 */
export function catalogForTier(tier: 'free' | 'premium'): Activity[] {
  return tier === 'premium' ? CATALOG : FREE_CATALOG;
}

export function activityById(kind: Activity['kind'], id: string): Activity | undefined {
  return CATALOG.find((a) => a.kind === kind && a.id === id);
}
