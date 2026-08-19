import { emptySkillState, applyObservation } from '../lib/mastery';
import { ALL_SKILLS, type SkillId, type SkillState } from '../model/types';

export function makeSkills(overrides: Partial<Record<SkillId, Partial<SkillState>>> = {}): Record<SkillId, SkillState> {
  const skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, emptySkillState()])) as Record<SkillId, SkillState>;
  for (const [skill, patch] of Object.entries(overrides) as [SkillId, Partial<SkillState>][]) {
    skills[skill] = { ...skills[skill], ...patch };
  }
  return skills;
}

/** run n observations of the same value into a fresh skill state */
export function trained(value: number, n: number, startAt = 1_700_000_000_000): SkillState {
  let state = emptySkillState();
  for (let i = 0; i < n; i++) {
    state = applyObservation(state, value, 1, 120, startAt + i * 86_400_000);
  }
  return state;
}
