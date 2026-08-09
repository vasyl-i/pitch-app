/**
 * Mastery math: how one observed exercise result updates a skill's long-term
 * state. Pure and deterministic — same state + same observation always gives
 * the same result.
 *
 * Design:
 * - Mastery is a slow EWMA of observed values, so it reflects long-term
 *   performance, never a single lesson. A parallel fast EWMA supplies the
 *   trend (fast pulling away from slow = improving/declining).
 * - The learning rate shrinks as confidence grows: early sessions move the
 *   estimate quickly out of the neutral prior, a year of history barely
 *   twitches on one bad day.
 * - Evidence (and therefore confidence) decays with a 30-day half-life, so a
 *   long break honestly lowers certainty without erasing the estimate.
 */
import type { MasteryBand, SkillState, Trend } from '../model/types';

/** neutral prior a skill starts from before any evidence */
export const BASELINE_MASTERY = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const EVIDENCE_HALF_LIFE_DAYS = 30;
/** evidence units at which confidence reaches ~63% */
const CONFIDENCE_SCALE = 6;
/** trend needs at least this many sessions before it can leave 'steady' */
const TREND_MIN_SESSIONS = 3;
const TREND_GAP = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function emptySkillState(): SkillState {
  return {
    mastery: BASELINE_MASTERY,
    confidence: 0,
    trend: 'steady',
    practiceTimeSec: 0,
    lastUpdated: null,
    exercisesCompleted: 0,
    fast: BASELINE_MASTERY,
    slow: BASELINE_MASTERY,
    evidence: 0,
  };
}

/** evidence remaining after time has passed since the last observation */
export function decayedEvidence(evidence: number, lastUpdated: number | null, now: number): number {
  if (lastUpdated === null) return evidence;
  const days = Math.max(0, now - lastUpdated) / DAY_MS;
  return evidence * Math.pow(0.5, days / EVIDENCE_HALF_LIFE_DAYS);
}

export function confidenceFromEvidence(evidence: number): number {
  return 1 - Math.exp(-evidence / CONFIDENCE_SCALE);
}

/**
 * Fold one observation into a skill's state.
 *
 * @param value       observed performance 0–100
 * @param weight      0–1 contribution weight from the skill map
 * @param durationSec singing seconds attributed to this skill
 */
export function applyObservation(
  state: SkillState,
  value: number,
  weight: number,
  durationSec: number,
  at: number
): SkillState {
  const evidence = decayedEvidence(state.evidence, state.lastUpdated, at) + weight;
  const confidence = confidenceFromEvidence(evidence);

  // 0.30·w for a fresh skill down to ~0.08·w once well-evidenced
  const slowRate = weight * (0.3 - 0.22 * confidence);
  const fastRate = Math.min(0.6, slowRate * 3);

  const slow = state.slow + slowRate * (value - state.slow);
  const fast = state.fast + fastRate * (value - state.fast);

  const exercisesCompleted = state.exercisesCompleted + 1;
  let trend: Trend = 'steady';
  if (exercisesCompleted >= TREND_MIN_SESSIONS) {
    if (fast - slow >= TREND_GAP) trend = 'improving';
    else if (fast - slow <= -TREND_GAP) trend = 'declining';
  }

  return {
    mastery: clamp(Math.round(slow), 0, 100),
    confidence,
    trend,
    practiceTimeSec: state.practiceTimeSec + Math.round(durationSec * weight),
    lastUpdated: at,
    exercisesCompleted,
    fast,
    slow,
    evidence,
  };
}

/** confidence as it stands *now* (evidence keeps decaying between sessions) */
export function currentConfidence(state: SkillState, now: number): number {
  return confidenceFromEvidence(decayedEvidence(state.evidence, state.lastUpdated, now));
}

/** the task's five progression states, from mastery + evidence */
export function masteryBand(state: SkillState): MasteryBand {
  if (state.exercisesCompleted === 0) return 'not-started';
  if (state.mastery < 40) return 'learning';
  if (state.mastery < 65) return 'practicing';
  if (state.mastery < 85 || state.confidence < 0.5) return 'confident';
  return 'mastered';
}

export const BAND_LABELS: Record<MasteryBand, string> = {
  'not-started': 'Not started',
  learning: 'Learning',
  practicing: 'Practicing',
  confident: 'Confident',
  mastered: 'Mastered',
};
