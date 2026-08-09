/**
 * The adaptive-learning domain model.
 *
 * Everything here is plain serializable data. The services in `../lib` are
 * pure functions over these shapes, which is what keeps the learning engine
 * deterministic and unit-testable under plain Node (no React Native imports
 * anywhere in the lib layer).
 */

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

export const SKILL_LABELS: Record<SkillId, string> = {
  'pitch-accuracy': 'Pitch accuracy',
  'pitch-stability': 'Pitch stability',
  'rhythm-accuracy': 'Rhythm accuracy',
  'rhythm-memory': 'Rhythm memory',
  'interval-recognition': 'Interval recognition',
  'interval-singing': 'Interval singing',
  'chord-recognition': 'Chord recognition',
  'chord-singing': 'Chord singing',
  'melody-reproduction': 'Melody reproduction',
  'pitch-memory': 'Pitch memory',
  'musical-memory': 'Musical memory',
  'sight-singing': 'Sight singing',
  'voice-control': 'Voice control',
};

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
  preferredDifficulty: PreferredDifficulty;
  updatedAt: number;
}

export const GOAL_LABELS: Record<LearningGoal, string> = {
  'sing-in-tune': 'Sing in tune',
  'train-ear': 'Train my ear',
  'expand-range': 'Expand my vocal range',
  'vocal-control': 'Improve vocal control',
  'learn-songs': 'Learn songs faster',
  'sight-singing': 'Sight singing',
  performance: 'Prepare for performances',
  'complete-beginner': 'Complete beginner',
};

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
  /** rough minutes one session takes */
  minutes: number;
  /** intrinsic difficulty 0–1, for warm-up/challenge slotting */
  challenge: number;
}

/* ------------------------------------------------------------------ *
 * Lessons                                                             *
 * ------------------------------------------------------------------ */

export type LessonSlot = 'warmup' | 'core-1' | 'core-2' | 'review' | 'challenge' | 'cooldown';

export const SLOT_LABELS: Record<LessonSlot, string> = {
  warmup: 'Warm-up',
  'core-1': 'Focus practice',
  'core-2': 'Focus practice',
  review: 'Review',
  challenge: 'Challenge',
  cooldown: 'Cool down',
};

export interface LessonStep {
  slot: LessonSlot;
  activity: Activity;
  /** tier chosen by adaptive difficulty, when the activity has tiers */
  difficultyId?: string;
  /** why this step is in today's lesson — always explainable */
  reason: string;
  estMinutes: number;
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
