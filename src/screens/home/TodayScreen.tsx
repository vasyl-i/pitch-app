/**
 * Home: the dashboard — overall progress, today's exercise plan,
 * and the primary entry point into daily practice.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen, TabTitleRow } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import { continuePractice } from '../session/lessonFlow';
import { VocalMonitorBanner } from './ui/VocalMonitorBanner';
import { ProgressSection } from './ui/ProgressSection';
import { TodayExerciseList } from './ui/TodayExerciseList';
import { useTodayOverview } from './useTodayOverview';
import { useDevMenuTap, useStepPress } from './useStepPress';
import LottieView from 'lottie-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const { steps, completedSlots, planReady, overall, todayStats, doneCount, allDone } = useTodayOverview();
  const onStepPress = useStepPress(completedSlots, navigation);
  const onHeadingTap = useDevMenuTap(navigation);

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <Animated.View entering={FadeInRight}>
        <TabTitleRow>
          <Pressable onPress={onHeadingTap}>
            <AppText variant="title">{t('home.heading')}</AppText>
          </Pressable>
        </TabTitleRow>
        </Animated.View>

        {/* same gap under the heading as on Account, so the banner holds still across tabs */}
        <Animated.View entering={FadeInRight.delay(100)}>
        <VocalMonitorBanner onPress={() => navigation.navigate('VocalMonitor')} style={styles.banner} />
        </Animated.View>
        <Animated.View entering={FadeInRight.delay(200)}>
        <ProgressSection accuracy={overall.accuracy} streak={overall.streak} practiceTime={overall.time} />
        </Animated.View>

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
            delay={300}
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
