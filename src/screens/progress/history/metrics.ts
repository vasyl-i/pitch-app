import { SKILL_LABELS, type SkillId } from '@/features/learning';
import { formatTotalPracticeTime, type DayStats } from '@/features/progress';
import { formatNumber, t } from '@/shared/i18n';
import type { HistoryMetric } from '@/app/navigation/types';

export type CountMetric = Exclude<HistoryMetric, SkillId>;

/** an all-time count: what each day adds, and how a total reads */
export interface CountSpec {
  pick: (row: DayStats) => number;
  format: (value: number) => string;
}

export const COUNT_METRICS: Record<CountMetric, CountSpec> = {
  'perfect-notes': { pick: (row) => row.perfectNotes, format: (v) => formatNumber(v) },
  'practice-days': { pick: (row) => (row.sessions > 0 ? 1 : 0), format: (v) => t('common.daysShort', { count: v }) },
  'practice-time': { pick: (row) => row.practiceSec, format: formatTotalPracticeTime },
};

export function isCountMetric(metric: HistoryMetric): metric is CountMetric {
  return metric in COUNT_METRICS;
}

export function metricTitle(metric: HistoryMetric): string {
  if (!isCountMetric(metric)) return SKILL_LABELS[metric];
  return {
    'perfect-notes': t('progress.stats.perfectNotes'),
    'practice-days': t('progress.stats.daysPracticed'),
    'practice-time': t('progress.stats.practiceTime'),
  }[metric];
}

export function metricExplanation(metric: HistoryMetric): string {
  if (!isCountMetric(metric)) return t('progress.history.explain.skill');
  return {
    'perfect-notes': t('progress.history.explain.perfectNotes'),
    'practice-days': t('progress.history.explain.practiceDays'),
    'practice-time': t('progress.history.explain.practiceTime'),
  }[metric];
}
