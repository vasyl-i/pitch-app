import { useMemo } from 'react';
import { buildJourneyArea, nodeActivity, useLearningStore, type JourneyMilestone, type SkillCategory } from '@/features/learning';
import { useTranslation } from '@/shared/i18n';
import type { ProgressScreenProps } from '@/app/navigation/types';

/**
 * One journey area: its milestones, the strongest skill and the one being
 * worked on, and replaying a done or current milestone as free practice.
 */
export function useJourneyArea(category: SkillCategory, navigation: ProgressScreenProps<'JourneyArea'>['navigation']) {
  const { i18n } = useTranslation();
  const skills = useLearningStore((s) => s.skills);
  // area copy is resolved while building, so the language is a dependency too
  const area = useMemo(() => buildJourneyArea(category, skills), [category, skills, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const strongest = area.skills.find((s) => s.state.exercisesCompleted > 0);
  const workingOn = [...area.skills].reverse().find((s) => s.state.exercisesCompleted > 0);

  const replay = (m: JourneyMilestone) => {
    const activity = nodeActivity(m.node);
    if (!activity) return;
    if (activity.kind === 'melody') navigation.navigate('MelodyPractice', { exerciseId: activity.id });
    else navigation.navigate('EarSession', { exerciseId: activity.id, difficultyId: m.node.difficultyId });
  };

  return { area, strongest, workingOn: workingOn?.skill !== strongest?.skill ? workingOn : undefined, replay };
}
