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
import { t, translatedRecord } from '@/shared/i18n';
import { SKILL_LABELS } from '../model/types';
import { GOAL_SKILLS } from './skillMap';
import { hashSeed, mulberry32, pickSeeded } from './seeded';

export const FOCUS_TITLES: Record<SkillId, string> = translatedRecord<SkillId>({
  'pitch-accuracy': 'learning.focusTitles.pitchAccuracy',
  'pitch-stability': 'learning.focusTitles.pitchStability',
  'rhythm-accuracy': 'learning.focusTitles.rhythmAccuracy',
  'rhythm-memory': 'learning.focusTitles.rhythmMemory',
  'interval-recognition': 'learning.focusTitles.intervalRecognition',
  'interval-singing': 'learning.focusTitles.intervalSinging',
  'chord-recognition': 'learning.focusTitles.chordRecognition',
  'chord-singing': 'learning.focusTitles.chordSinging',
  'melody-reproduction': 'learning.focusTitles.melodyReproduction',
  'pitch-memory': 'learning.focusTitles.pitchMemory',
  'musical-memory': 'learning.focusTitles.musicalMemory',
  'sight-singing': 'learning.focusTitles.sightSinging',
  'voice-control': 'learning.focusTitles.voiceControl',
});

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
    summary.push(t('learning.weekly.noPractice'));
  } else {
    summary.push(
      t('learning.weekly.practiced', {
        days: t('learning.weekly.days', { count: input.daysPracticed }),
        sessions: t('learning.weekly.sessions', { count: input.sessions }),
      })
    );
    if (strongestImprovement) {
      summary.push(
        t('learning.weekly.biggestJump', {
          skill: SKILL_LABELS[strongestImprovement.skill],
          from: strongestImprovement.from,
          to: strongestImprovement.to,
        })
      );
    }
    if (input.focus) {
      const focusDelta = masteryChanges.find((d) => d.skill === input.focus);
      summary.push(
        focusDelta && focusDelta.to > focusDelta.from
          ? t('learning.weekly.focusMoved', { skill: SKILL_LABELS[input.focus], from: focusDelta.from, to: focusDelta.to })
          : t('learning.weekly.focusWas', { skill: SKILL_LABELS[input.focus] })
      );
    }
    if (weakestSkill) {
      summary.push(t('learning.weekly.weakest', { skill: SKILL_LABELS[weakestSkill], mastery: skills[weakestSkill].mastery }));
    }
  }
  summary.push(t('learning.weekly.nextFocus', { focus: FOCUS_TITLES[recommendedFocus] }));

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
