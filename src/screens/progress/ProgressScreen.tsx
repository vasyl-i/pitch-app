/**
 * The Progress tab: growth made visible. Stats, trends, insights, calendar,
 * and doorways into the weekly review and the perfect-runs list. Shows what
 * happened — never a place to pick exercises.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { PracticeCalendar, SkillTrendChart, WeeklyAccuracyChart } from '@/features/progress';
import { ALL_SKILLS } from '@/features/learning';
import { AppText, Card, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ProgressScreenProps } from '@/app/navigation/types';
import { useProgressOverview } from './useProgressOverview';
import { StatTile } from './ui/StatTile';
import { ChartCard } from './ui/ChartCard';
import { InsightsCard } from './ui/InsightsCard';
import { WeeklyAccuracyCard } from './ui/WeeklyAccuracyCard';
import { LinkCard } from './ui/LinkCard';

export function ProgressScreen({ navigation }: ProgressScreenProps<'ProgressOverview'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const p = useProgressOverview();

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <AppText variant="title">{t('nav.progress')}</AppText>

        {!p.hasSessions ? (
          <Card style={styles.empty}>
            <AppText variant="body">{t('progress.empty')}</AppText>
          </Card>
        ) : (
          <>
            <View style={styles.tiles}>
              <StatTile
                label={t('progress.perfectRuns')}
                value={String(p.perfectCount)}
                icon="trophy"
                onPress={() => navigation.navigate('PerfectExercises')}
              />
              <StatTile
                label={t('progress.daysPracticed')}
                value={p.practiceDays > 0 ? t('common.daysShort', { count: p.practiceDays }) : '—'}
                icon="star"
              />
              <StatTile label={t('home.stats.practiceTime')} value={p.practiceTime} icon="time" />
            </View>

            {p.insights.length > 0 && <InsightsCard insights={p.insights} />}
            <WeeklyAccuracyCard week={p.week} />
            <ChartCard title={t('progress.accuracyTrend')}>
              <WeeklyAccuracyChart points={p.trend} />
            </ChartCard>
            {p.weekSnapshots.length >= 2 && (
              <ChartCard title={t('progress.masteryOverTime')}>
                <SkillTrendChart snapshots={p.weekSnapshots} skills={[...ALL_SKILLS]} />
              </ChartCard>
            )}
            <ChartCard>
              <PracticeCalendar practicedDays={p.calendarDays} />
            </ChartCard>
          </>
        )}

        <LinkCard
          icon="calendar"
          title={t('progress.weeklyReview')}
          subtitle={t('progress.weeklyReviewSubtitle')}
          onPress={() => navigation.navigate('WeeklyReview')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  empty: { padding: 18, marginTop: spacing.lg },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
