import { StyleSheet, View } from 'react-native';
import type { weeklyStats } from '@/features/progress';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { progressCardStyles } from './ChartCard';

/** this week's average score, and how it moved against last week */
export function WeeklyAccuracyCard({ week }: { week: ReturnType<typeof weeklyStats> }) {
  const { t } = useTranslation();
  const delta = week.scoreDelta;
  return (
    <Card style={progressCardStyles.card}>
      <View style={styles.row}>
        <AppText variant="caption">{t('progress.weeklyAccuracy')}</AppText>
        {delta !== null && delta !== 0 && (
          <AppText variant="caption" color={delta > 0 ? palette.accent : palette.warning}>
            {delta > 0 ? '▲' : '▼'} {t('progress.vsLastWeek', { delta: Math.abs(delta) })}
          </AppText>
        )}
      </View>
      <View style={[styles.row, styles.values]}>
        <AppText variant="score" weight="regular">
          {week.sungSessions > 0 ? week.avgScore : '—'}
        </AppText>
        <AppText variant="caption">{t('progress.avgSummary', { cents: week.avgCents })}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  values: { marginTop: spacing.sm },
});
