/**
 * The weekly report: practice consistency, mastery movement, weakest area,
 * and the recommended focus for next week — assembled by the pure weekly
 * service from progress history + the learning profile.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOCUS_TITLES } from '@/features/learning';
import { formatPracticeTime } from '@/features/progress';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { ProgressScreenProps } from '@/app/navigation/types';
import { useWeeklyReport } from './useWeeklyReport';
import { MasteryChangesCard, NextWeekCard, ReviewTile, SummaryCard } from './ReviewSections';

export function WeeklyReviewScreen({ navigation }: ProgressScreenProps<'WeeklyReview'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const report = useWeeklyReport();

  return (
    <Screen>
      {/* fixed above the scrolling report */}
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 2 * spacing.xxl }]}>
        <AppText variant="score">{t('progress.weeklyReview')}</AppText>
        {report.focus && (
          <AppText variant="body" style={styles.focus}>
            {FOCUS_TITLES[report.focus]}
          </AppText>
        )}

        <View style={styles.tiles}>
          <ReviewTile label={t('progress.review.days')} value={String(report.daysPracticed)} icon="calendar" />
          <ReviewTile label={t('progress.review.sessions')} value={String(report.sessions)} icon="musical-notes" />
          <ReviewTile label={t('progress.review.time')} value={formatPracticeTime(report.practiceSeconds)} icon="time" />
          <ReviewTile label={t('progress.review.streak')} value={t('common.daysShort', { count: report.streak })} icon="star" />
        </View>

        <SummaryCard lines={report.summary} />
        {report.masteryChanges.length > 0 && <MasteryChangesCard changes={report.masteryChanges} />}
        <NextWeekCard focus={report.recommendedFocus} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg + spacing.sm },
  focus: { marginTop: spacing.xs },
  tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: 18 },
});
