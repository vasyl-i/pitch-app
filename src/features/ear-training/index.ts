/** Public API of the ear-training feature. */
export { useEarTrainingSession } from './model/useEarTrainingSession';
export { useEarTrainingStore } from './model/earTrainingStore';
export type { LiveFeedback } from './model/earTrainingStore';
export { EXERCISES, exerciseById, difficultyLabel } from './model/definitions';
export type { EarPhase, ExerciseDefinition, ExerciseId } from './model/types';
export type { NoteOutcome, OutcomeStatus, OverlayNote, RoundScore, RoundVerdict, SessionSummary } from './lib/evaluators';
