/**
 * The one place that knows which skills each practice mode trains, and which
 * of a session record's metrics measures each skill. Everything downstream —
 * mastery updates, lesson generation, recommendations, weekly reviews — reads
 * exercise→skill knowledge from here, so a future exercise type participates
 * in the whole platform by adding one entry (plus a catalog activity).
 *
 * Keys match the progress store's `SessionRecord.exerciseId` namespace:
 * ear-training records arrive as `ear:<id>`, staff-practice records as the
 * melody library id.
 */
import type { LearningGoal, SkillId } from '../model/types';

/** which headline metric of a session record carries the skill's signal */
export type MetricId = 'score' | 'stability' | 'rhythm';

export interface SkillContribution {
  skill: SkillId;
  /** 0–1: how strongly one session of this exercise evidences the skill */
  weight: number;
  metric: MetricId;
}

const c = (skill: SkillId, weight: number, metric: MetricId = 'score'): SkillContribution => ({ skill, weight, metric });

/** ear-training drills, keyed by bare ExerciseId (without the `ear:` prefix) */
const EAR_CONTRIBUTIONS: Record<string, SkillContribution[]> = {
  'note-echo': [c('pitch-accuracy', 1), c('pitch-memory', 0.3), c('voice-control', 0.3, 'stability')],
  'chord-tones': [c('chord-singing', 1), c('chord-recognition', 0.5), c('interval-singing', 0.4)],
  'major-minor': [c('chord-recognition', 1)],
  'pitch-memory': [c('pitch-memory', 1), c('musical-memory', 0.5), c('pitch-accuracy', 0.3)],
  'melody-echo': [c('melody-reproduction', 1), c('musical-memory', 0.6), c('rhythm-memory', 0.5, 'rhythm'), c('pitch-accuracy', 0.3)],
  'odd-one-out': [c('interval-recognition', 0.6), c('chord-recognition', 0.4), c('musical-memory', 0.3)],
  'finish-melody': [c('musical-memory', 0.8), c('interval-singing', 0.4), c('pitch-accuracy', 0.3)],
  'sing-interval': [c('interval-singing', 1), c('interval-recognition', 0.5), c('pitch-accuracy', 0.3)],
  'echo-interval': [c('interval-recognition', 0.7), c('melody-reproduction', 0.5), c('pitch-accuracy', 0.3)],
};

/** unknown future ear drills still feed the profile, just cautiously */
const GENERIC_EAR: SkillContribution[] = [c('pitch-accuracy', 0.4), c('musical-memory', 0.3)];

/** staff practice: sung against notation with real stability/rhythm grading */
const MELODY_CONTRIBUTIONS: SkillContribution[] = [
  c('pitch-accuracy', 0.8),
  c('pitch-stability', 1, 'stability'),
  c('rhythm-accuracy', 1, 'rhythm'),
  c('melody-reproduction', 0.6),
  c('sight-singing', 0.5),
  c('voice-control', 0.6, 'stability'),
  c('rhythm-memory', 0.3, 'rhythm'),
];

export function contributionsFor(exerciseId: string): SkillContribution[] {
  if (exerciseId.startsWith('ear:')) {
    return EAR_CONTRIBUTIONS[exerciseId.slice(4)] ?? GENERIC_EAR;
  }
  return MELODY_CONTRIBUTIONS;
}

/** which skills advance each learning goal, most central first */
export const GOAL_SKILLS: Record<LearningGoal, SkillId[]> = {
  'sing-in-tune': ['pitch-accuracy', 'pitch-stability', 'interval-singing'],
  'train-ear': ['interval-recognition', 'chord-recognition', 'pitch-memory', 'musical-memory'],
  'expand-range': ['voice-control', 'pitch-stability', 'pitch-accuracy'],
  'vocal-control': ['voice-control', 'pitch-stability', 'pitch-accuracy'],
  'learn-songs': ['melody-reproduction', 'musical-memory', 'rhythm-memory'],
  'sight-singing': ['sight-singing', 'rhythm-accuracy', 'interval-singing'],
  performance: ['melody-reproduction', 'voice-control', 'rhythm-accuracy'],
  'complete-beginner': ['pitch-accuracy', 'pitch-memory', 'melody-reproduction'],
};
