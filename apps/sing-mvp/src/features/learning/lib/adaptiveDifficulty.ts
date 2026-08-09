/**
 * Adaptive difficulty: which tier of an activity to serve, given the skill
 * profile, the user's stated difficulty preference, recent results and
 * fatigue. Tier moves follow mastery — which is itself a slow average — so
 * difficulty changes always feel gradual; on top of that a step is clamped to
 * one tier of adjustment from the mastery-implied tier.
 */
import type { Activity, LearningPreferences, SessionAnnotation, SkillId, SkillState } from '../model/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** the challenge level (0–1) today's material should sit at for a skill */
export function targetChallenge(
  state: SkillState,
  prefs: Pick<LearningPreferences, 'preferredDifficulty'> | null,
  fatigued: boolean
): number {
  let t = 0.15 + (state.mastery / 100) * 0.6; // 0.15 (novice) → 0.75 (mastered)
  const pref = prefs?.preferredDifficulty ?? 'adaptive';
  if (pref === 'easy') t -= 0.15;
  if (pref === 'challenge') t += 0.15;
  if (fatigued) t -= 0.1;
  return clamp(t, 0.1, 0.85);
}

/** mean recent observed value for a skill, from session annotations (newest first) */
export function recentSkillAverage(annotations: SessionAnnotation[], skill: SkillId, limit = 3): number | null {
  const values: number[] = [];
  for (const a of annotations) {
    const entry = a.skills[skill];
    if (entry) values.push(entry.value);
    if (values.length >= limit) break;
  }
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Pick the difficulty tier for an activity. Returns undefined when the
 * activity has a single form.
 */
export function pickDifficultyId(
  activity: Activity,
  skills: Record<SkillId, SkillState>,
  prefs: Pick<LearningPreferences, 'preferredDifficulty'> | null,
  annotations: SessionAnnotation[],
  fatigued = false
): string | undefined {
  const tiers = activity.difficulties;
  if (!tiers || tiers.length === 0) return undefined;

  const primary = activity.skills[0];
  const state = skills[primary];

  // mastery → base tier (thresholds spread across however many tiers exist)
  const bands = [40, 60, 75]; // below first → tier 0, etc.
  let tier = bands.filter((b) => state.mastery >= b).length;

  // recent form nudges one step: struggling drops a tier, cruising adds one
  const recent = recentSkillAverage(annotations, primary);
  if (recent !== null && recent < 55) tier -= 1;
  else if (recent !== null && recent > 88) tier += 1;

  const pref = prefs?.preferredDifficulty ?? 'adaptive';
  if (pref === 'easy') tier -= 1;
  if (pref === 'challenge') tier += 1;
  if (fatigued) tier -= 1;

  return tiers[clamp(tier, 0, tiers.length - 1)];
}

/** one tier above what adaptive difficulty would serve — the challenge slot */
export function pickChallengeDifficultyId(
  activity: Activity,
  skills: Record<SkillId, SkillState>,
  prefs: Pick<LearningPreferences, 'preferredDifficulty'> | null,
  annotations: SessionAnnotation[]
): string | undefined {
  const tiers = activity.difficulties;
  if (!tiers || tiers.length === 0) return undefined;
  const base = pickDifficultyId(activity, skills, prefs, annotations);
  const i = base ? tiers.indexOf(base) : 0;
  return tiers[clamp(i + 1, 0, tiers.length - 1)];
}
