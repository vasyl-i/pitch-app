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
import { categoryTier, type ExerciseCategory } from '../../../entities/exercise/categories';
import { exercises as melodyLibrary } from '../../../entities/exercise/library';
import type { Activity, SkillId } from '../model/types';

/**
 * Ear drills: `secondsPerRep` is one round — prompt, count-in, the open mic
 * window, the result beat — measured against the session's timings.
 */
const EAR_DRILLS: Omit<Activity, 'minutes'>[] = [
  {
    kind: 'ear',
    id: 'note-echo',
    title: 'Echo the note',
    tier: 'free',
    skills: ['pitch-accuracy', 'pitch-memory'],
    difficulties: null,
    secondsPerRep: 9,
    challenge: 0.15,
    rounds: 5,
  },
  {
    kind: 'ear',
    id: 'major-minor',
    title: 'Major or minor?',
    tier: 'free',
    skills: ['chord-recognition'],
    difficulties: null,
    secondsPerRep: 6,
    challenge: 0.2,
    rounds: 8,
  },
  {
    kind: 'ear',
    id: 'melody-echo',
    title: 'Echo the melody',
    tier: 'free',
    skills: ['melody-reproduction', 'musical-memory', 'rhythm-memory'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    secondsPerRep: 13,
    challenge: 0.35,
    rounds: 4,
  },
  {
    kind: 'ear',
    id: 'pitch-memory',
    title: 'Pitch memory',
    tier: 'free',
    skills: ['pitch-memory', 'musical-memory'],
    difficulties: ['easy', 'medium', 'hard', 'expert'],
    secondsPerRep: 16,
    challenge: 0.35,
    rounds: 3,
  },
  {
    kind: 'ear',
    id: 'odd-one-out',
    title: 'Odd one out',
    tier: 'free',
    skills: ['interval-recognition', 'chord-recognition'],
    difficulties: ['intervals', 'chords', 'scales'],
    secondsPerRep: 9,
    challenge: 0.4,
    rounds: 6,
  },
  {
    kind: 'ear',
    id: 'finish-melody',
    title: 'Finish the melody',
    tier: 'free',
    skills: ['musical-memory', 'interval-singing'],
    difficulties: null,
    secondsPerRep: 10,
    challenge: 0.4,
    rounds: 5,
  },
  {
    kind: 'ear',
    id: 'echo-interval',
    title: 'Echo the interval',
    tier: 'free',
    skills: ['interval-recognition', 'melody-reproduction'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    secondsPerRep: 11,
    challenge: 0.35,
    rounds: 5,
  },
  {
    kind: 'ear',
    id: 'sing-interval',
    title: 'Sing the interval',
    tier: 'free',
    skills: ['interval-singing', 'interval-recognition'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    secondsPerRep: 10,
    challenge: 0.5,
    rounds: 5,
  },
  {
    kind: 'ear',
    id: 'chord-tones',
    title: 'Chord tones',
    tier: 'free',
    skills: ['chord-singing', 'chord-recognition', 'interval-singing'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    secondsPerRep: 14,
    challenge: 0.6,
    rounds: 4,
  },
];

/**
 * How each melody category behaves as practice: which skills it trains
 * (primary first — that drives need-scoring and difficulty) and a floor on
 * intrinsic challenge. How long it takes comes from the melody itself.
 *
 * This is the single place a new exercise category has to touch to become a
 * full citizen of the platform: lessons, recommendations, weak-spot training
 * and the skill tree all read the catalog.
 */
const CATEGORY_PROFILE: Record<ExerciseCategory, { skills: SkillId[]; minChallenge: number }> = {
  warmup: {
    skills: ['voice-control', 'pitch-stability', 'pitch-accuracy', 'sight-singing'],
    minChallenge: 0,
  },
  melody: {
    skills: ['melody-reproduction', 'pitch-accuracy', 'rhythm-accuracy', 'sight-singing'],
    minChallenge: 0,
  },
  modes: {
    skills: ['sight-singing', 'pitch-accuracy', 'interval-singing', 'musical-memory'],
    minChallenge: 0.55,
  },
  jazz: {
    skills: ['chord-singing', 'interval-singing', 'pitch-accuracy'],
    minChallenge: 0.6,
  },
  chromatic: {
    skills: ['pitch-accuracy', 'interval-singing', 'pitch-stability'],
    minChallenge: 0.7,
  },
  agility: {
    skills: ['voice-control', 'rhythm-accuracy', 'melody-reproduction', 'pitch-accuracy'],
    minChallenge: 0.75,
  },
  belt: {
    skills: ['voice-control', 'pitch-stability', 'pitch-accuracy'],
    minChallenge: 0.8,
  },
  harmony: {
    skills: ['pitch-stability', 'chord-singing', 'pitch-accuracy'],
    minChallenge: 0.7,
  },
};

const DIFFICULTY_CHALLENGE: Record<string, number> = { easy: 0.2, medium: 0.4, hard: 0.6 };

/** the melody player's count-in before the first note, in seconds */
const MELODY_LEAD_IN_SEC = 1.2;
/** stage gaps, the "now on your own" card and a glance at the summary */
const MELODY_RUN_OVERHEAD_SEC = 9;
/** an ear session's intro and closing summary, on top of its rounds */
const EAR_SESSION_OVERHEAD_SEC = 10;

/**
 * Real seconds a session takes at `reps` repetitions — ear rounds, or full
 * melody runs (each one already includes its own overhead).
 */
export function sessionSeconds(activity: Omit<Activity, 'minutes'>, reps = activity.rounds): number {
  const overhead = activity.kind === 'ear' ? EAR_SESSION_OVERHEAD_SEC : 0;
  return overhead + reps * activity.secondsPerRep;
}

/** whole minutes for display, never below one */
export function displayMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

const withMinutes = (a: Omit<Activity, 'minutes'>): Activity => ({ ...a, minutes: displayMinutes(sessionSeconds(a)) });

const EAR_ACTIVITIES: Activity[] = EAR_DRILLS.map(withMinutes);

export const MELODY_ACTIVITIES: Activity[] = melodyLibrary.map((e) => {
  const profile = CATEGORY_PROFILE[e.category];
  const phraseSec = e.notes.reduce((end, n) => Math.max(end, n.start + n.duration), 0);
  return withMinutes({
    kind: 'melody',
    id: e.id,
    title: e.title,
    // free vs. Premium is decided per category (songs and the scale/arpeggio
    // warm-ups are free; the advanced library is Premium)
    tier: categoryTier(e.category),
    skills: profile.skills,
    difficulties: null,
    // a run sounds the phrase twice: the listen stage, then the solo pass
    secondsPerRep: Math.round(2 * (MELODY_LEAD_IN_SEC + phraseSec) + MELODY_RUN_OVERHEAD_SEC),
    challenge: Math.max(profile.minChallenge, DIFFICULTY_CHALLENGE[e.difficulty] ?? 0.4),
    rounds: 1,
  });
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

/** All known activities — ear + melody — for lookups. */
const ALL_ACTIVITIES: Activity[] = [...EAR_ACTIVITIES, ...MELODY_ACTIVITIES];

export function activityById(kind: Activity['kind'], id: string): Activity | undefined {
  return ALL_ACTIVITIES.find((a) => a.kind === kind && a.id === id);
}
