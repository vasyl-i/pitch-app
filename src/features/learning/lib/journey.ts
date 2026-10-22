/**
 * The Journey: a read-model over the skill tree that answers "what have I
 * learned?" rather than "what should I practice?". Each area is a musical
 * ability described by outcome ("Sing in Tune"), and its milestones are the
 * same SKILL_TREE nodes — reinterpreted as progress markers, not launchers.
 *
 * Pure functions over skill state, like the rest of the lib layer.
 */
import type { SkillId, SkillState } from '../model/types';
import { t, translatedRecord } from '@/shared/i18n';
import { SKILL_LABELS } from '../model/types';
import { BAND_LABELS, masteryBand } from './mastery';
import { SKILL_TREE, SKILL_TREE_CATEGORIES, type LessonNode, type SkillCategory } from './skillTree';

/** outcome-language area titles — never expose internal category names */
export const JOURNEY_AREA_TITLES: Record<SkillCategory, string> = translatedRecord<SkillCategory>({
  pitch: 'learning.journeyAreas.pitch.title',
  intervals: 'learning.journeyAreas.intervals.title',
  chords: 'learning.journeyAreas.chords.title',
  melody: 'learning.journeyAreas.melody.title',
  rhythm: 'learning.journeyAreas.rhythm.title',
  tonality: 'learning.journeyAreas.tonality.title',
  'voice-control': 'learning.journeyAreas.voiceControl.title',
  'musical-memory': 'learning.journeyAreas.musicalMemory.title',
  'sight-singing': 'learning.journeyAreas.sightSinging.title',
  performance: 'learning.journeyAreas.performance.title',
});

export const JOURNEY_AREA_TAGLINES: Record<SkillCategory, string> = translatedRecord<SkillCategory>({
  pitch: 'learning.journeyAreas.pitch.tagline',
  intervals: 'learning.journeyAreas.intervals.tagline',
  chords: 'learning.journeyAreas.chords.tagline',
  melody: 'learning.journeyAreas.melody.tagline',
  rhythm: 'learning.journeyAreas.rhythm.tagline',
  tonality: 'learning.journeyAreas.tonality.tagline',
  'voice-control': 'learning.journeyAreas.voiceControl.tagline',
  'musical-memory': 'learning.journeyAreas.musicalMemory.tagline',
  'sight-singing': 'learning.journeyAreas.sightSinging.tagline',
  performance: 'learning.journeyAreas.performance.tagline',
});

/** mastery of a milestone's primary skill at which it counts as achieved */
export const MILESTONE_DONE_MASTERY = 55;

export type MilestoneState = 'done' | 'current' | 'upcoming' | 'locked';

export interface JourneyMilestone {
  node: LessonNode;
  state: MilestoneState;
  /** the primary skill's mastery, for progress display */
  mastery: number;
  /** friendly explanation shown on locked milestones */
  lockedHint: string | null;
}

export interface JourneyArea {
  category: SkillCategory;
  title: string;
  tagline: string;
  milestones: JourneyMilestone[];
  doneCount: number;
  totalCount: number;
  /** average mastery across the area's distinct primary skills, 0–100 */
  mastery: number;
  /** true once any milestone in the area has real practice behind it */
  started: boolean;
  /** the area's distinct skills with their states, strongest first */
  skills: { skill: SkillId; label: string; state: SkillState; bandLabel: string }[];
}

function lockedHint(node: LessonNode): string {
  const skills = [...new Set(node.requires.map((r) => SKILL_LABELS[r.skill].toLowerCase()))];
  return t('learning.journeyLockedHint', { skills: skills.join(t('common.and')) });
}

export function buildJourneyArea(category: SkillCategory, skills: Record<SkillId, SkillState>): JourneyArea {
  const nodes = SKILL_TREE.filter((n) => n.category === category);

  let currentAssigned = false;
  const milestones: JourneyMilestone[] = nodes.map((node) => {
    const skill = skills[node.primarySkill];
    const unlocked = node.requires.every((r) => skills[r.skill].mastery >= r.mastery);
    const done = unlocked && skill.exercisesCompleted > 0 && skill.mastery >= MILESTONE_DONE_MASTERY;
    let state: MilestoneState;
    if (!unlocked) state = 'locked';
    else if (done) state = 'done';
    else if (!currentAssigned) {
      state = 'current';
      currentAssigned = true;
    } else state = 'upcoming';
    return {
      node,
      state,
      mastery: skill.mastery,
      lockedHint: unlocked ? null : lockedHint(node),
    };
  });

  const distinctSkills = [...new Set(nodes.map((n) => n.primarySkill))];
  const areaSkills = distinctSkills
    .map((skill) => ({
      skill,
      label: SKILL_LABELS[skill],
      state: skills[skill],
      bandLabel: BAND_LABELS[masteryBand(skills[skill])],
    }))
    .sort((a, b) => b.state.mastery - a.state.mastery);

  return {
    category,
    title: JOURNEY_AREA_TITLES[category],
    tagline: JOURNEY_AREA_TAGLINES[category],
    milestones,
    doneCount: milestones.filter((m) => m.state === 'done').length,
    totalCount: milestones.length,
    mastery: Math.round(distinctSkills.reduce((sum, s) => sum + skills[s].mastery, 0) / Math.max(1, distinctSkills.length)),
    started: distinctSkills.some((s) => skills[s].exercisesCompleted > 0),
    skills: areaSkills,
  };
}

export function buildJourney(skills: Record<SkillId, SkillState>): JourneyArea[] {
  return SKILL_TREE_CATEGORIES.map((category) => buildJourneyArea(category, skills));
}
