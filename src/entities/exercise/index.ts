/** Target-melody exercises: the content model, how to fit it to a voice, and how to grade it. */
export type { Exercise, TargetNote, ExerciseCategory, ExercisePattern, Difficulty } from './types';
export { exercises, odeToJoy, melodyById, isSong } from './library';
export { EXERCISE_CATEGORIES, categoriesInOrder, categoryMeta, categoryRepeats, categoryTier } from './categories';
export type { ExerciseCategoryMeta, ExerciseRepeat, ExerciseTier } from './categories';
export { fitToRange, keyLadder, keyRoom, ladderRoom, nextSweepKey, randomKey, transposeExercise, transposeKeyLabel } from './transpose';
export type { KeyDirection, KeyRoom, Transposition } from './transpose';
export {
  centsToTarget,
  verdictOfCents,
  gradeNote,
  gradePhrase,
  createPhraseEvaluator,
  PERFECT_CENTS,
  SLIGHT_CENTS,
  VERDICT_GLYPH,
  VERDICT_LABEL,
} from './evaluation';
export type { Verdict, NoteResult, PhraseSummary, GradeFrame, PhraseEvaluator } from './evaluation';
export { compareAttempts } from './comparison';
export type { AttemptComparison, AttemptTrend } from './comparison';
