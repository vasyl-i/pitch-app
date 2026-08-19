/**
 * The adaptive learning platform: persistent skill profile, learning
 * preferences, deterministic lesson generation, spaced repetition,
 * recommendations, coaching feedback, weekly focus and reviews.
 *
 * All logic lives in pure `lib/` services over the `model/` data shapes;
 * screens compose those services and render.
 */
export type {
  Activity,
  DailyLesson,
  Insight,
  LearningGoal,
  LearningPreferences,
  LessonSlot,
  LessonStep,
  MasteryBand,
  Recommendation,
  ReviewState,
  SessionAnnotation,
  SkillId,
  SkillState,
  Trend,
  WeeklyReport,
} from './model/types';
export { ALL_SKILLS, GOAL_LABELS, SKILL_LABELS, SLOT_LABELS } from './model/types';

export { useLearningStore, emptySkills } from './model/learningStore';
export { usePreferencesStore, DEFAULT_PREFERENCES, GENRE_OPTIONS } from './model/preferencesStore';
export { useLessonSessionStore, nextGuidedStep } from './model/lessonSessionStore';
export type { GuidedStep } from './model/lessonSessionStore';

export { startLearningTracker } from './lib/tracker';
export { masteryBand, BAND_LABELS, currentConfidence } from './lib/mastery';
export { generateDailyLesson } from './lib/lessonGenerator';
export type { LessonInput, TendencyFact } from './lib/lessonGenerator';
export { buildRecommendations } from './lib/recommendations';
export { buildCoachMessage, buildSessionInsights } from './lib/coach';
export { chooseWeeklyFocus, buildWeeklyReview, weekKeyOf, FOCUS_TITLES } from './lib/weekly';
export type { WeeklyReviewInput } from './lib/weekly';
export { dueReviews, REVIEW_INTERVALS_DAYS } from './lib/spacedRepetition';
export { CATALOG, FREE_CATALOG, catalogForTier, activityById } from './lib/catalog';
export { generateFixedLesson } from './lib/fixedProgression';
export type { FixedLessonInput } from './lib/fixedProgression';
export {
  findWeakSpots,
  aggregateHistory,
  intervalName,
  midiName,
  WEAK_SPOT_WINDOW_DAYS,
} from './lib/weakSpots';
export type { WeakSpot, WeakSpotInput, WeakSpotKind, SessionLike } from './lib/weakSpots';
export { nodeActivity, SKILL_TREE } from './lib/skillTree';
export type { LessonNode, SkillCategory } from './lib/skillTree';
export {
  buildJourney,
  buildJourneyArea,
  JOURNEY_AREA_TITLES,
  JOURNEY_AREA_TAGLINES,
  MILESTONE_DONE_MASTERY,
} from './lib/journey';
export type { JourneyArea, JourneyMilestone, MilestoneState } from './lib/journey';
export { GOAL_SKILLS } from './lib/skillMap';
