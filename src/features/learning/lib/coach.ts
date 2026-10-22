/**
 * Coach feedback and post-session insights: template-based, generated only
 * from measured facts, always positive-specific-actionable. Deterministic —
 * the same profile produces the same message.
 */
import type { Insight, SessionAnnotation, SkillId, SkillState, Trend } from '../model/types';
import { t } from '@/shared/i18n';
import { SKILL_LABELS } from '../model/types';
import type { TendencyFact } from './lessonGenerator';

const skillsByTrend = (skills: Record<SkillId, SkillState>, trend: Trend): SkillId[] =>
  (Object.keys(skills) as SkillId[])
    .filter((s) => skills[s].trend === trend && skills[s].exercisesCompleted >= 3)
    .sort((a, b) => skills[b].confidence - skills[a].confidence);

/**
 * One headline coaching message for the Learn screen: a genuine positive
 * first, then the most useful actionable, never discouraging.
 */
export function buildCoachMessage(
  skills: Record<SkillId, SkillState>,
  tendencies: TendencyFact[],
  annotations: SessionAnnotation[]
): string {
  const trained = (Object.keys(skills) as SkillId[]).filter((s) => skills[s].exercisesCompleted > 0);
  if (trained.length === 0) {
    return t('learning.coach.welcome');
  }

  const parts: string[] = [];

  const improving = skillsByTrend(skills, 'improving')[0];
  const strongest = [...trained].sort((a, b) => skills[b].mastery - skills[a].mastery)[0];
  if (improving) {
    parts.push(t('learning.coach.improving', { skill: SKILL_LABELS[improving] }));
  } else if (strongest && skills[strongest].mastery >= 55) {
    parts.push(t('learning.coach.strength', { skill: SKILL_LABELS[strongest], mastery: skills[strongest].mastery }));
  } else {
    parts.push(t('learning.coach.solidBase'));
  }

  const tendency = tendencies.filter((t) => t.count >= 5 && Math.abs(t.avgCents) >= 20)[0];
  const declining = skillsByTrend(skills, 'declining')[0];
  const weakest = [...trained].sort((a, b) => skills[a].mastery - skills[b].mastery)[0];
  if (tendency) {
    parts.push(
      tendency.avgCents > 0
        ? t('learning.coach.sharp', { note: tendency.name })
        : t('learning.coach.flat', { note: tendency.name })
    );
  } else if (declining) {
    parts.push(t('learning.coach.declining', { skill: SKILL_LABELS[declining] }));
  } else if (weakest && skills[weakest].mastery < 50) {
    parts.push(t('learning.coach.opportunity', { skill: SKILL_LABELS[weakest] }));
  }

  return parts.join(' ');
}

/**
 * Plain-language insights for the most recent session, judged against the
 * long-term profile (the annotation's deltas are exactly "this session vs the
 * long-term average", since mastery is that average).
 */
export function buildSessionInsights(
  latest: SessionAnnotation | null,
  todaysAnnotations: SessionAnnotation[],
  skills: Record<SkillId, SkillState>
): Insight[] {
  if (!latest) return [];
  const insights: Insight[] = [];

  const entries = (Object.entries(latest.skills) as [SkillId, { value: number; delta: number }][]).sort(
    (a, b) => b[1].delta - a[1].delta
  );

  const best = entries[0];
  if (best && best[1].delta >= 0.5) {
    insights.push({
      kind: 'improvement',
      text: t('learning.insights.improved', { skill: SKILL_LABELS[best[0]] }),
    });
  }
  const steady = entries.find(([, v]) => Math.abs(v.delta) < 0.5);
  if (steady) {
    insights.push({ kind: 'steady', text: t('learning.insights.steady', { skill: SKILL_LABELS[steady[0]] }) });
  }
  const worst = entries[entries.length - 1];
  if (worst && worst !== best && worst[1].delta <= -1) {
    insights.push({
      kind: 'decline',
      text: t('learning.insights.below', { skill: SKILL_LABELS[worst[0]] }),
    });
  }

  // fatigue pattern: several sessions today and the later ones ran lower
  if (todaysAnnotations.length >= 2) {
    const values = (a: SessionAnnotation) =>
      Object.values(a.skills).reduce((s, v) => s + v.value, 0) / Math.max(1, Object.keys(a.skills).length);
    const ordered = [...todaysAnnotations].sort((a, b) => a.sessionAt - b.sessionAt);
    const first = values(ordered[0]);
    const last = values(ordered[ordered.length - 1]);
    if (first - last >= 8) {
      insights.push({
        kind: 'observation',
        text: t('learning.insights.fatigue'),
      });
    }
  }

  if (latest.mistakes.includes('intonation') && !insights.some((i) => i.kind === 'decline')) {
    insights.push({
      kind: 'observation',
      text: t('learning.insights.intonation'),
    });
  }

  return insights.slice(0, 3);
}
