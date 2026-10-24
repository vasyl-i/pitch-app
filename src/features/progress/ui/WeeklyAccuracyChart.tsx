import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { WeeklyAccuracyPoint } from '../lib/stats';
import { EmptyScoreBar, ScoreBar } from './ScoreBar';

/** Average accuracy per week as bars — is the singer trending up across weeks? */
export function WeeklyAccuracyChart({ points }: { points: WeeklyAccuracyPoint[] }) {
  const { t } = useTranslation();

  if (points.filter((p) => p.avgScore !== null).length < 2) {
    return (
      <AppText variant="caption" style={styles.empty}>
        {t('progress.charts.accuracyEmpty')}
      </AppText>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {points.map((p, i) =>
          p.avgScore === null ? (
            <EmptyScoreBar key={p.weekStart} />
          ) : (
            <ScoreBar key={p.weekStart} score={p.avgScore} latest={i === points.length - 1} />
          ),
        )}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption">{t('progress.charts.weeksAgo', { count: points.length })}</AppText>
        <AppText variant="caption">{t('progress.charts.thisWeek')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: spacing.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
