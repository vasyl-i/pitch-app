/**
 * Home: the dashboard — overall progress, today's exercise plan,
 * and the primary entry point into daily practice.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import { PremiumBanner } from '@/screens/subscription';
import { continuePractice } from '../session/lessonFlow';
import { ProgressSection } from './ui/ProgressSection';
import { TodayExerciseList } from './ui/TodayExerciseList';
import { useTodayOverview } from './useTodayOverview';
import { useDevMenuTap, useStepPress } from './useStepPress';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const { steps, completedSlots, planReady, overall, todayStats, doneCount, allDone } = useTodayOverview();
  const onStepPress = useStepPress(completedSlots, navigation);
  const onHeadingTap = useDevMenuTap(navigation);

  return (
    <Screen noHorizontalPadding noBottomPadding>
      {/* horizontal padding lives on the content so the scroll view doesn't
          clip the trial reminder poking past the banner's right edge */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <Pressable onPress={onHeadingTap}>
          <AppText variant="title">{t('home.heading')}</AppText>
        </Pressable>

        {/* same gap under the heading as on Account, so the banner holds still across tabs */}
        <PremiumBanner source="today" style={styles.banner} />

        <ProgressSection accuracy={overall.accuracy} streak={overall.streak} practiceTime={overall.time} />

        <View style={styles.plan}>
          <TodayExerciseList
            steps={steps}
            completedSlots={completedSlots}
            planReady={planReady}
            allDone={allDone}
            doneCount={doneCount}
            onPrimaryAction={() => continuePractice(navigation)}
            onStepPress={onStepPress}
            todayStats={todayStats}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  banner: { marginTop: spacing.lg },
  plan: { marginTop: spacing.xl },
});
