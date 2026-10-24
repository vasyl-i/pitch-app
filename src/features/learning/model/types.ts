/**
 * The adaptive-learning domain model.
 *
 * Everything here is plain serializable data. The services in `../lib` are
 * pure functions over these shapes, which is what keeps the learning engine
 * deterministic and unit-testable under plain Node (no React Native imports
 * anywhere in the lib layer).
 */

import { translatedRecord } from '@/shared/i18n';

/* ------------------------------------------------------------------ *
 * Skills                                                              *
 * ------------------------------------------------------------------ */

/** The independent long-term abilities the platform tracks. */
export type SkillId =
  | 'pitch-accuracy'
  | 'pitch-stability'
  | 'rhythm-accuracy'
  | 'rhythm-memory'
  | 'interval-recognition'
  | 'interval-singing'
  | 'chord-recognition'
  | 'chord-singing'
  | 'melody-reproduction'
  | 'pitch-memory'
  | 'musical-memory'
  | 'sight-singing'
  | 'voice-control';

export const ALL_SKILLS: readonly SkillId[] = [
  'pitch-accuracy',
  'pitch-stability',
  'rhythm-accuracy',
  'rhythm-memory',
  'interval-recognition',
  'interval-singing',
  'chord-recognition',
  'chord-singing',
  'melody-reproduction',
  'pitch-memory',
  'musical-memory',
  'sight-singing',
  'voice-control',
];

export const SKILL_LABELS: Record<SkillId, string> = translatedRecord<SkillId>({
  'pitch-accuracy': 'learning.skills.pitchAccuracy',
  'pitch-stability': 'learning.skills.pitchStability',
  'rhythm-accuracy': 'learning.skills.rhythmAccuracy',
  'rhythm-memory': 'learning.skills.rhythmMemory',
  'interval-recognition': 'learning.skills.intervalRecognition',
  'interval-singing': 'learning.skills.intervalSinging',
  'chord-recognition': 'learning.skills.chordRecognition',
  'chord-singing': 'learning.skills.chordSinging',
  'melody-reproduction': 'learning.skills.melodyReproduction',
  'pitch-memory': 'learning.skills.pitchMemory',
  'musical-memory': 'learning.skills.musicalMemory',
  'sight-singing': 'learning.skills.sightSinging',
  'voice-control': 'learning.skills.voiceControl',
});

export type Trend = 'improving' | 'steady' | 'declining';

/**
 * Long-term state of one skill. Mastery is a slow moving average over every
 * relevant attempt ever made — never the score of a single lesson. `fast`,
 * `slow` and `evidence` are the internals the mastery math maintains; screens
 * should read `mastery`, `confidence` and `trend`.
 */
export interface SkillState {
  /** 0–100 long-term ability estimate */
  mastery: number;
  /** 0–1: how much evidence backs the mastery estimate (decays with inactivity) */
  confidence: number;
  trend: Trend;
  practiceTimeSec: number;
  /** epoch ms of the last contributing exercise, null if never trained */
  lastUpdated: number | null;
  exercisesCompleted: number;
  /** short-horizon EWMA — trend numerator */
  fast: number;
  /** long-horizon EWMA — the mastery estimate itself */
  slow: number;
  /** decayed count of weighted observations — confidence numerator */
  evidence: number;
}

/** The task's five lesson/skill states, derived from a SkillState. */
export type MasteryBand = 'not-started' | 'learning' | 'practicing' | 'confident' | 'mastered';

/* ------------------------------------------------------------------ *
 * Learning preferences (user profile)                                 *
 * ------------------------------------------------------------------ */

export type LearningGoal =
  | 'sing-in-tune'
  | 'train-ear'
  | 'expand-range'
  | 'vocal-control'
  | 'learn-songs'
  | 'sight-singing'
  | 'performance'
  | 'complete-beginner';

export type ExperienceLevel = 'complete-beginner' | 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type MusicReading = 'none' | 'basic' | 'comfortable' | 'advanced';
export type PreferredDifficulty = 'adaptive' | 'easy' | 'normal' | 'challenge';
export type CoachStyle = 'encouraging' | 'direct' | 'technical';
export type DailyMinutes = 5 | 10 | 15 | 20 | 30;

/** Goals selected during the simplified onboarding flow. */
export type ImprovementGoal = 'sing-in-tune' | 'hit-notes' | 'feel-confident';

export const IMPROVEMENT_GOAL_LABELS: Record<ImprovementGoal, string> = translatedRecord<ImprovementGoal>({
  'sing-in-tune': 'learning.improvementGoals.singInTune',
  'hit-notes': 'learning.improvementGoals.hitNotes',
  'feel-confident': 'learning.improvementGoals.feelConfident',
});

/* ------------------------------------------------------------------ *
 * Weekly exercise plan                                                *
 * ------------------------------------------------------------------ */

/** 0=Mon, 1=Tue, … 6=Sun — ISO weekday order */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A single exercise entry in a user's weekly plan for one day. */
export interface WeeklyExerciseEntry {
  activityId: string;
  kind: ActivityKind;
  difficultyId?: string;
}

/**
 * Custom weekly exercise plan. Each day maps to an ordered list of exercises.
 * Days without an entry use the default lesson generator.
 */
export type WeeklyPlan = Partial<Record<WeekdayIndex, WeeklyExerciseEntry[]>>;

export interface LearningPreferences {
  primaryGoal: LearningGoal;
  secondaryGoal: LearningGoal | null;
  dailyMinutes: DailyMinutes;
  experience: ExperienceLevel;
  musicReading: MusicReading;
  preferredGenres: string[];
  coachStyle: CoachStyle;
  /** local hour 0–23 the user wants a practice reminder, null = none */
  reminderHour: number | null;
  /** minute 0–59 within the reminder hour, default 0 */
  reminderMinute: number;
  preferredDifficulty: PreferredDifficulty;
  /** 0–1 weighting toward ear training vs melody practice; 0.5 = balanced */
  exerciseBalance?: number;
  /** activity IDs the user has disabled from daily plans */
  disabledExercises?: string[];
  /** suppress the "this will clear results" warning when re-doing a completed exercise */
  skipRedoWarning?: boolean;
  /** improvement goals selected during onboarding */
  improvementGoals?: ImprovementGoal[];
  /** user's custom weekly exercise plan — overrides the generator for set days */
  weeklyPlan?: WeeklyPlan;
  updatedAt: number;
}

export const GOAL_LABELS: Record<LearningGoal, string> = translatedRecord<LearningGoal>({
  'sing-in-tune': 'learning.goals.singInTune',
  'train-ear': 'learning.goals.trainEar',
  'expand-range': 'learning.goals.expandRange',
  'vocal-control': 'learning.goals.vocalControl',
  'learn-songs': 'learning.goals.learnSongs',
  'sight-singing': 'learning.goals.sightSinging',
  performance: 'learning.goals.performance',
  'complete-beginner': 'learning.goals.completeBeginner',
});

/* ------------------------------------------------------------------ *
 * Activities (the lesson-generation catalog)                          *
 * ------------------------------------------------------------------ */

export type ActivityKind = 'ear' | 'melody';

/**
 * One launchable unit of practice: an ear-training drill (with an optional
 * difficulty tier) or a staff-practice melody. New exercise types join the
 * whole platform — lessons, recommendations, the skill tree, reviews — by
 * adding a catalog entry and a skill mapping; nothing else changes.
 */
export interface Activity {
  kind: ActivityKind;
  /** ear ExerciseId or melody library id */
  id: string;
  title: string;
  /**
   * Which tier may practise this. The generator and recommender are handed a
   * tier-filtered catalog rather than checking entitlements themselves — a
   * lesson that recommends an exercise the user cannot open is worse than no
   * recommendation at all.
   */
  tier: 'free' | 'premium';
  /** skills trained, primary first (drives need-scoring and difficulty) */
  skills: SkillId[];
  /** ordered easiest → hardest tier ids, null when the activity has one form */
  difficulties: string[] | null;
  /** rough minutes one session takes at its default `rounds` (rounded, at least 1) */
  minutes: number;
  /**
   * Real seconds one repetition takes: one round of an ear drill, one full
   * run (listen + sing) of a melody. Drives fitting a day to its time budget.
   */
  secondsPerRep: number;
  /** intrinsic difficulty 0–1, for warm-up/challenge slotting */
  challenge: number;
  /** default repetitions per session: ear rounds (3–6), melody sung passes (1) */
  rounds: number;
  /** hard ceiling on rounds even when a day's plan stretches the session */
  maxRounds?: number;
}

/* ------------------------------------------------------------------ *
 * Lessons                                                             *
 * ------------------------------------------------------------------ */

/**
 * Named lesson slots used by the generators. Weekly plan lessons use indexed
 * string slots ('step-0', 'step-1', …) so the type is widened to `string`
 * wherever slots are stored or compared.
 */
export type LessonSlot = 'warmup' | 'core-1' | 'core-2' | 'review' | 'challenge' | 'cooldown' | (string & {});

export const SLOT_LABELS: Partial<Record<string, string>> = translatedRecord({
  warmup: 'learning.slots.warmup',
  'core-1': 'learning.slots.focus',
  'core-2': 'learning.slots.focus',
  review: 'learning.slots.review',
  challenge: 'learning.slots.challenge',
  cooldown: 'learning.slots.cooldown',
});

export interface LessonStep {
  slot: LessonSlot;
  activity: Activity;
  /** tier chosen by adaptive difficulty, when the activity has tiers */
  difficultyId?: string;
  /** why this step is in today's lesson — always explainable */
  reason: string;
  estMinutes: number;
  /** repetitions fitted to the day's time budget; defaults to `activity.rounds` */
  rounds?: number;
}

export interface DailyLesson {
  /** local calendar day the lesson was generated for */
  dayKey: string;
  focus: SkillId | null;
  steps: LessonStep[];
  estMinutes: number;
}

/* ------------------------------------------------------------------ *
 * Spaced repetition                                                   *
 * ------------------------------------------------------------------ */

export interface ReviewState {
  /** index into REVIEW_INTERVALS_DAYS */
  intervalIndex: number;
  nextDueAt: number;
  lastPracticedAt: number;
}

/* ------------------------------------------------------------------ *
 * Practice history annotations                                        *
 * ------------------------------------------------------------------ */

export type MistakeTag = 'intonation' | 'stability' | 'rhythm' | 'accuracy';

/**
 * The learning engine's record of one ingested practice session. Headline
 * numbers (score, duration, date) already live in the progress store's
 * SessionRecord — this stores only the *new* facts, keyed by the same
 * timestamp, so nothing is stored twice.
 */
export interface SessionAnnotation {
  /** joins to SessionRecord.at */
  sessionAt: number;
  exerciseId: string;
  /** per trained skill: the observed 0–100 value and the mastery delta it caused */
  skills: Partial<Record<SkillId, { value: number; delta: number }>>;
  mistakes: MistakeTag[];
  /** the weekly focus active when this session happened */
  weeklyFocus: SkillId | null;
}

/* ------------------------------------------------------------------ *
 * Recommendations, insights, weekly review                            *
 * ------------------------------------------------------------------ */

export interface Recommendation {
  id: string;
  /** which deterministic rule produced it */
  ruleId: 'due-review' | 'tendency' | 'goal-gap' | 'declining' | 'unexplored' | 'level-up';
  title: string;
  /** the WHY, in plain language — every recommendation must have one */
  reason: string;
  activity: Activity;
  difficultyId?: string;
  /** lower = more important */
  priority: number;
}

export interface Insight {
  kind: 'improvement' | 'steady' | 'decline' | 'observation';
  text: string;
}

export interface SkillDelta {
  skill: SkillId;
  from: number;
  to: number;
}

export interface WeeklyReport {
  weekKey: string;
  focus: SkillId | null;
  daysPracticed: number;
  sessions: number;
  practiceSeconds: number;
  streak: number;
  /** biggest positive mastery move this week */
  strongestImprovement: SkillDelta | null;
  /** lowest-mastery trained skill right now */
  weakestSkill: SkillId | null;
  masteryChanges: SkillDelta[];
  recommendedFocus: SkillId;
  /** plain-language summary lines */
  summary: string[];
}
