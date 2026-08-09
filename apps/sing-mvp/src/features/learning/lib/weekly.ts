/**
 * Weekly focus + weekly review. The focus is chosen deterministically at the
 * start of each week (seeded by the week key) from the weakest goal-aligned
 * skills, and flows into lesson generation, recommendations and coaching.
 */
import type {
  LearningPreferences,
  SessionAnnotation,
  SkillDelta,
  SkillId,
  SkillState,
  WeeklyReport,
} from '../model/types';
import { SKILL_LABELS } from '../model/types';
import { GOAL_SKILLS } from './skillMap';
import { hashSeed, mulberry32, pickSeeded } from './seeded';

export const FOCUS_TITLES: Record<SkillId, string> = {
  'pitch-accuracy': 'Pitch Accuracy Week',
  'pitch-stability': 'Pitch Stability Week',
  'rhythm-accuracy': 'Rhythm Week',
  'rhythm-memory': 'Rhythm Memory Week',
  'interval-recognition': 'Interval Week',
  'interval-singing': 'Interval Singing Week',
  'chord-recognition': 'Chord Hearing Week',
  'chord-singing': 'Chord Singing Week',
  'melody-reproduction': 'Melody Week',
  'pitch-memory': 'Pitch Memory Week',
  'musical-memory': 'Musical Memory Week',
  'sight-singing': 'Sight Singing Week',
  'voice-control': 'Voice Control Week',
};

/** local-time week key; weeks start on Monday */
export function weekKeyOf(now: number): string {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Mon = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
}

/**
 * Pick this week's focus: one of the three weakest skills that serve the
 * user's goals (all skills, if no preferences yet), never last week's focus
 * two weeks running when an alternative exists.
 */
export function chooseWeeklyFocus(
  skills: Record<SkillId, SkillState>,
  prefs: LearningPreferences | null,
  weekKey: string,
  previousFocus: SkillId | null
): SkillId {
  const aligned = prefs
    ? [...new Set([...GOAL_SKILLS[prefs.primaryGoal], ...(prefs.secondaryGoal ? GOAL_SKILLS[prefs.secondaryGoal] : [])])]
    : (Object.keys(skills) as SkillId[]);

  const ranked = [...aligned].sort((a, b) => skills[a].mastery - skills[b].mastery);
  let candidates = ranked.slice(0, 3).filter((s) => s !== previousFocus);
  if (candidates.length === 0) candidates = ranked.slice(0, 1);
  return pickSeeded(candidates, mulberry32(hashSeed(`focus:${weekKey}`)));
}

export interface WeeklyReviewInput {
  weekKey: string;
  focus: SkillId | null;
  skills: Record<SkillId, SkillState>;
  /** mastery per skill at the start of the week (this week's snapshot) */
  startOfWeekMastery: Record<SkillId, number> | null;
  /** annotations from sessions this week, newest first */
  annotations: SessionAnnotation[];
  daysPracticed: number;
  sessions: number;
  practiceSeconds: number;
  streak: number;
  prefs: LearningPreferences | null;
}

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReport {
  const { skills, startOfWeekMastery } = input;

  const masteryChanges: SkillDelta[] = [];
  if (startOfWeekMastery) {
    for (const [skill, from] of Object.entries(startOfWeekMastery) as [SkillId, number][]) {
      const to = skills[skill].mastery;
      if (Math.round(to - from) !== 0) masteryChanges.push({ skill, from, to });
    }
    masteryChanges.sort((a, b) => b.to - b.from - (a.to - a.from));
  }

  const strongestImprovement = masteryChanges.find((d) => d.to > d.from) ?? null;

  const trainedSkills = (Object.keys(skills) as SkillId[]).filter((s) => skills[s].exercisesCompleted > 0);
  const weakestSkill = trainedSkills.length
    ? trainedSkills.reduce((min, s) => (skills[s].mastery < skills[min].mastery ? s : min))
    : null;

  const recommendedFocus = chooseWeeklyFocus(skills, input.prefs, `${input.weekKey}:next`, input.focus);

  const summary: string[] = [];
  if (input.sessions === 0) {
    summary.push('No practice recorded this week — even one 5-minute session keeps skills from fading.');
  } else {
    summary.push(
      `You practiced on ${input.daysPracticed} day${input.daysPracticed === 1 ? '' : 's'} this week (${input.sessions} session${input.sessions === 1 ? '' : 's'}).`
    );
    if (strongestImprovement) {
      summary.push(
        `${SKILL_LABELS[strongestImprovement.skill]} made the biggest jump: ${strongestImprovement.from} → ${strongestImprovement.to}.`
      );
    }
    if (input.focus) {
      const focusDelta = masteryChanges.find((d) => d.skill === input.focus);
      summary.push(
        focusDelta && focusDelta.to > focusDelta.from
          ? `Your focus (${SKILL_LABELS[input.focus]}) moved ${focusDelta.from} → ${focusDelta.to} — the focused work paid off.`
          : `Your focus was ${SKILL_LABELS[input.focus]} — keep giving it a little time each session.`
      );
    }
    if (weakestSkill) {
      summary.push(`${SKILL_LABELS[weakestSkill]} is currently your weakest area (${skills[weakestSkill].mastery}/100).`);
    }
  }
  summary.push(`Suggested focus for next week: ${FOCUS_TITLES[recommendedFocus]}.`);

  return {
    weekKey: input.weekKey,
    focus: input.focus,
    daysPracticed: input.daysPracticed,
    sessions: input.sessions,
    practiceSeconds: input.practiceSeconds,
    streak: input.streak,
    strongestImprovement,
    weakestSkill,
    masteryChanges,
    recommendedFocus,
    summary,
  };
}
