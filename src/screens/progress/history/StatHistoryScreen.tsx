/**
 * One Progress number over time: where it stands, how it moved over the
 * chosen range, a chart, and what the number means in plain words.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryBarChart, HistoryLineChart, isoDayStart, RangeTabs } from '@/features/progress';
import { AppText, Card, Screen, ScreenHeader } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { formatDate, useTranslation } from '@/shared/i18n';
import type { ProgressScreenProps } from '@/app/navigation/types';
import { useStatHistory } from './useStatHistory';
import { metricExplanation, metricTitle } from './metrics';

const shortDate = (day: string) => formatDate(new Date(isoDayStart(day)), { day: 'numeric', month: 'short' });

export function StatHistoryScreen({ navigation, route }: ProgressScreenProps<'StatHistory'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { metric } = route.params;
  const { range, setRange, view } = useStatHistory(metric);

  return (
    <Screen noBottomPadding>
      <ScreenHeader title={metricTitle(metric)} onBack={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 5 * spacing.xxl }}>
        <View style={styles.hero}>
          <AppText variant="caption">{view.caption}</AppText>
          <AppText variant="score">{view.value}</AppText>
          {view.change && (
            <AppText variant="small" color={view.change.startsWith('+') ? palette.accent : palette.textSecondary}>
              {view.change}
            </AppText>
          )}
        </View>

        <RangeTabs value={range} onChange={setRange} />

        <Card style={styles.card}>
          {view.kind === 'count' ? (
            <HistoryBarChart buckets={view.buckets} formatValue={view.format} />
          ) : view.points.length > 0 ? (
            <HistoryLineChart points={view.points} startDay={view.startDay} endDay={view.endDay} />
          ) : (
            <AppText variant="small" color={palette.textFaint} style={styles.empty}>
              {t('progress.history.skillEmpty')}
            </AppText>
          )}
          <View style={styles.axis}>
            <AppText variant="caption">{shortDate(view.startDay)}</AppText>
            <AppText variant="caption">{t('progress.history.today')}</AppText>
          </View>
          {view.kind === 'count' && (
            <AppText variant="caption" center style={styles.note}>
              {view.bucketNote}
            </AppText>
          )}
        </Card>

        <Card style={styles.card}>
          <AppText variant="label" weight="medium">
            {t('progress.history.whatItMeans')}
          </AppText>
          <AppText variant="small" color={palette.textFaint} style={styles.explain}>
            {metricExplanation(metric)}
          </AppText>
        </Card>

        {metric === 'perfect-notes' && (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('PerfectExercises')}>
            {({ pressed }) => (
              <Card style={[styles.card, styles.link, pressed && styles.pressed]}>
                <AppText variant="label" style={styles.fill}>
                  {t('progress.perfectRuns')}
                </AppText>
                <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
              </Card>
            )}
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.sm, marginBottom: spacing.lg, gap: 10 },
  card: { marginTop: spacing.md, padding: spacing.xl, borderRadius: radii.md },
  empty: { paddingVertical: spacing.xxl },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  note: { marginTop: spacing.sm },
  explain: { marginTop: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.8 },
  fill: { flex: 1 },
});
