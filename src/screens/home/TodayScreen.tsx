/**
 * Home: the dashboard. Overall all-time progress, this week's streak, and
 * today's exercise plan — the primary entry point into daily practice.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  MasterySparkline,
  currentStreak,
  formatPracticeTime,
  practicedDayKeys,
  todayExerciseStats,
  totalPracticeDays,
  totalPracticeSeconds,
  totalStars,
  useProgressStore,
} from '@/features/progress';
import { useLearningStore, useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement } from '@/features/subscription';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import type { GuidedStep } from '@/features/learning';
import { ensureTodaysLesson, beginStep, continuePractice, redoStep } from '../session/lessonFlow';
import { TodayBackground } from './TodayBackground';
import { todayColor } from './todayPalette';
import { SoftCard } from './ui/SoftCard';
import { TodayExerciseList } from './ui/TodayExerciseList';
import { WeeklyStreakRow } from './ui/WeeklyStreakRow';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
  const { spacing, typography } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const sessions = useProgressStore((s) => s.sessions);
  const prefs = usePreferencesStore((s) => s.preferences);
  const adaptive = useEntitlement('adaptive-lessons');
  const weekSnapshots = useLearningStore((s) => s.weekSnapshots);
  const steps = useLessonSessionStore((s) => s.steps);
  const completedSlots = useLessonSessionStore((s) => s.completedSlots);
  // snapshot today's plan once all persisted stores are hydrated
  const [planReady, setPlanReady] = useState(false);
  useEffect(() => {
    ensureTodaysLesson(() => setPlanReady(true));
  }, [prefs, adaptive]);

  const overall = useMemo(
    () => ({
      days: totalPracticeDays(sessions),
      time: formatPracticeTime(totalPracticeSeconds(sessions)),
      stars: totalStars(sessions),
      streak: currentStreak(sessions),
    }),
    [sessions]
  );
  const practicedDays = useMemo(() => practicedDayKeys(sessions), [sessions]);
  const todayStats = useMemo(() => todayExerciseStats(sessions), [sessions]);

  const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
  const allDone = planReady && steps.length > 0 && doneCount === steps.length;
  const skipRedoWarning = prefs?.skipRedoWarning ?? false;

  const handleStepPress = useCallback(
    (step: GuidedStep) => {
      const isCompleted = completedSlots.includes(step.slot);
      if (!isCompleted) {
        beginStep(step, navigation);
        return;
      }
      if (skipRedoWarning) {
        redoStep(step, navigation);
        return;
      }
      Alert.alert(
        'Redo exercise?',
        'This will clear your previous results for this exercise.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: "Don't show again",
            onPress: () => {
              usePreferencesStore.getState().setPreferences({ skipRedoWarning: true });
              redoStep(step, navigation);
            },
          },
          { text: 'Continue', onPress: () => redoStep(step, navigation) },
        ],
      );
    },
    [completedSlots, skipRedoWarning, navigation],
  );

  return (
    <Screen backdrop={<TodayBackground />}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <SoftCard style={{ padding: spacing.lg, marginTop: spacing.xl }}>
          <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 15 }}>
            Your progress
          </AppText>
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <Stat value={overall.days > 0 ? `${overall.days}d` : '—'} label="Days practiced" />
            <Stat value={overall.time} label="Total time" divider />
            <Stat value={`${overall.stars} ★`} label="Stars earned" divider starHighlight />
          </View>
          {weekSnapshots.length >= 2 && (
            <View style={{ marginTop: spacing.md }}>
              <MasterySparkline snapshots={weekSnapshots} color={todayColor.orange} />
            </View>
          )}
        </SoftCard>

        <View style={{ marginTop: spacing.xl }}>
          <TodayExerciseList
            steps={steps}
            completedSlots={completedSlots}
            planReady={planReady}
            allDone={allDone}
            doneCount={doneCount}
            onPrimaryAction={() => continuePractice(navigation)}
            onStepPress={handleStepPress}
            todayStats={todayStats}
          />
        </View>

        <SoftCard style={{ padding: spacing.lg, marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 15 }}>
              This week
            </AppText>
            <AppText color={todayColor.ink} style={{ fontFamily: typography.family.bold, fontSize: 15 }}>
              {overall.streak}d streak
            </AppText>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <WeeklyStreakRow practicedDays={practicedDays} />
          </View>
        </SoftCard>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label, divider = false, starHighlight = false }: { value: string; label: string; divider?: boolean; starHighlight?: boolean }) {
  const { typography, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        paddingLeft: divider ? spacing.md : 0,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: 'rgba(255, 255, 255, 0.14)',
      }}
    >
      <AppText
        color={starHighlight ? todayColor.orange : todayColor.ink}
        style={{ fontFamily: typography.family.bold, fontSize: 19, letterSpacing: -0.3 }}
      >
        {value}
      </AppText>
      <AppText color={todayColor.inkSecondary} variant="caption" style={{ fontSize: 12, marginTop: 2 }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}
