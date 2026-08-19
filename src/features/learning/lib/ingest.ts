/**
 * Folding one finished practice session into the learning profile: skill
 * mastery updates, spaced-repetition rescheduling, and the history annotation
 * (skills trained, mistakes, mastery deltas, active weekly focus).
 *
 * Pure: the store calls this and persists the result; tests call it directly.
 */
import type { MistakeTag, ReviewState, SessionAnnotation, SkillId, SkillState } from '../model/types';
import { applyObservation } from './mastery';
import { contributionsFor, type MetricId } from './skillMap';
import { scheduleReview } from './spacedRepetition';

/** the slice of a progress SessionRecord the learning engine consumes */
export interface SessionFacts {
  exerciseId: string;
  at: number;
  score: number;
  stability: number;
  rhythm: number;
  /** mean |cents| deviation */
  avgCents: number;
  durationSec?: number;
}

export interface IngestResult {
  skills: Record<SkillId, SkillState>;
  reviews: Partial<Record<SkillId, ReviewState>>;
  annotation: SessionAnnotation;
}

const metricValue = (facts: SessionFacts, metric: MetricId): number =>
  metric === 'stability' ? facts.stability : metric === 'rhythm' ? facts.rhythm : facts.score;

function detectMistakes(facts: SessionFacts): MistakeTag[] {
  const mistakes: MistakeTag[] = [];
  if (Math.abs(facts.avgCents) >= 25) mistakes.push('intonation');
  if (facts.stability < 65) mistakes.push('stability');
  if (facts.rhythm < 65) mistakes.push('rhythm');
  if (facts.score < 55) mistakes.push('accuracy');
  return mistakes;
}

export function ingestSession(
  skills: Record<SkillId, SkillState>,
  reviews: Partial<Record<SkillId, ReviewState>>,
  facts: SessionFacts,
  weeklyFocus: SkillId | null
): IngestResult {
  const nextSkills = { ...skills };
  const nextReviews = { ...reviews };
  const trained: SessionAnnotation['skills'] = {};

  for (const { skill, weight, metric } of contributionsFor(facts.exerciseId)) {
    const value = metricValue(facts, metric);
    const before = nextSkills[skill];
    const after = applyObservation(before, value, weight, facts.durationSec ?? 0, facts.at);
    nextSkills[skill] = after;
    nextReviews[skill] = scheduleReview(nextReviews[skill], value, after.mastery, facts.at);
    trained[skill] = { value: Math.round(value), delta: +(after.slow - before.slow).toFixed(2) };
  }

  return {
    skills: nextSkills,
    reviews: nextReviews,
    annotation: {
      sessionAt: facts.at,
      exerciseId: facts.exerciseId,
      skills: trained,
      mistakes: detectMistakes(facts),
      weeklyFocus,
    },
  };
}
