import { useMemo, useState } from 'react';
import {
  allTimePracticeSeconds,
  BUCKET_DAYS,
  bucketSeries,
  historyTotals,
  isoDay,
  rangeStartDay,
  rangeTotal,
  useProgressStore,
  type HistoryRange,
} from '@/features/progress';
import { masterySeries, useLearningStore } from '@/features/learning';
import { useTranslation } from '@/shared/i18n';
import type { HistoryMetric } from '@/app/navigation/types';
import { COUNT_METRICS, isCountMetric } from './metrics';

/**
 * One number's history for the chosen range. A skill reads as its mastery
 * now, how far it moved over the range, and a line of daily closes; a count
 * reads as its all-time total, the range's share of it, and bars per bucket.
 */
export function useStatHistory(metric: HistoryMetric) {
  const { t } = useTranslation();
  const [range, setRange] = useState<HistoryRange>('3m');
  const days = useProgressStore((s) => s.days);
  const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
  const skills = useLearningStore((s) => s.skills);
  const masteryHistory = useLearningStore((s) => s.masteryHistory);

  const view = useMemo(() => {
    const now = Date.now();
    const startDay = rangeStartDay(range, now);
    const endDay = isoDay(now);

    if (isCountMetric(metric)) {
      const spec = COUNT_METRICS[metric];
      const allTime = historyTotals(days);
      const total = metric === 'practice-time'
        ? allTimePracticeSeconds(totalPracticeSec, days)
        : metric === 'perfect-notes' ? allTime.perfectNotes : allTime.daysPracticed;
      const weeks = BUCKET_DAYS[range] / 7;
      return {
        kind: 'count' as const,
        value: total > 0 ? spec.format(total) : '—',
        caption: t('progress.history.allTime'),
        change: t('progress.history.inRange', { value: spec.format(rangeTotal(days, range, spec.pick, now)) }),
        buckets: bucketSeries(days, range, spec.pick, now),
        bucketNote: t('progress.history.bucket', { count: weeks }),
        format: spec.format,
        startDay,
        endDay,
      };
    }

    const trained = skills[metric].exercisesCompleted > 0;
    const points = masterySeries(masteryHistory, metric, startDay, endDay);
    const delta = points.length > 0 ? points[points.length - 1].value - points[0].value : 0;
    return {
      kind: 'skill' as const,
      value: trained ? `${skills[metric].mastery}%` : '—',
      caption: t('progress.history.now'),
      change: !trained
        ? null
        : delta > 0
          ? t('progress.history.gained', { delta })
          : delta < 0 ? t('progress.history.lost', { delta: -delta }) : t('progress.history.unchanged'),
      points,
      startDay,
      endDay,
    };
  }, [metric, range, days, totalPracticeSec, skills, masteryHistory, t]);

  return { range, setRange, view };
}
