/**
 * The Progress tab: growth made visible. Six headline numbers (each opens
 * its history), the practice calendar, what moved in the last 7 days, and
 * the week in plain words. Shows what happened — never a place to pick
 * exercises.
 */
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { PracticeCalendar } from '@/features/progress';
import { AppText, Card, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HistoryMetric, ProgressScreenProps } from '@/app/navigation/types';
import { useProgressOverview } from './useProgressOverview';
import { StatGrid } from './ui/StatGrid';
import { ProgressSection } from './ui/ProgressSection';
import { MasteryChanges } from './ui/MasteryChanges';

const MICROPHONE = require('../../../assets/microphone.png');

export function ProgressScreen({ navigation }: ProgressScreenProps<'ProgressOverview'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const p = useProgressOverview();
  const openHistory = (metric: HistoryMetric) => navigation.navigate('StatHistory', { metric });

  return (
    <Screen noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <View style={styles.titleRow}>
          <AppText variant="title">{t('nav.progress')}</AppText>
          <Image source={MICROPHONE} style={styles.titleIcon} accessibilityIgnoresInvertColors />
        </View>

        {!p.hasSessions ? (
          <Card style={styles.empty}>
            <AppText variant="body">{t('progress.empty')}</AppText>
          </Card>
        ) : (
          <>
            <StatGrid tiles={p.tiles} onOpen={openHistory} />

            <ProgressSection title={t('progress.sections.consistency')}>
              <PracticeCalendar practicedDays={p.calendarDays} />
            </ProgressSection>

            <ProgressSection title={t('progress.sections.masteryChanges')}>
              <MasteryChanges changes={p.report.masteryChanges} onOpen={openHistory} />
            </ProgressSection>

            <ProgressSection title={t('progress.sections.summary')}>
              {p.report.summary.map((line, i) => (
                <AppText key={line} variant="small" color={palette.textFaint} style={i > 0 && styles.line}>
                  {line}
                </AppText>
              ))}
            </ProgressSection>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {},
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: { width: 24, height: 24 },
  empty: { padding: 18, marginTop: spacing.lg },
  line: { marginTop: spacing.lg },
});
