/**
 * Home: the dashboard. Overall all-time progress, this week's streak, and the
 * two doors into practicing — sing with an instrumental, or train your ear.
 * The guided daily lesson itself lives on the Sing tab (`SingHubScreen`).
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  currentStreak,
  formatPracticeTime,
  practicedDayKeys,
  totalPracticeDays,
  totalPracticeSeconds,
  totalStars,
  useProgressStore,
} from '@/features/progress';
import { useAuthStore } from '@/features/auth';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import { TodayBackground } from './TodayBackground';
import { todayColor } from './todayPalette';
import { PillButton } from './ui/PillButton';
import { SoftCard } from './ui/SoftCard';
import { WeeklyStreakRow } from './ui/WeeklyStreakRow';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
  const { spacing, typography } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const user = useAuthStore((s) => s.user);
  const sessions = useProgressStore((s) => s.sessions);
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0];

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

  return (
    <Screen backdrop={<TodayBackground />}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText
            color={todayColor.ink}
            style={{ fontFamily: typography.family.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 }}
          >
            {firstName ? `Hi, ${firstName}` : 'Home'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={8}
          >
            {({ pressed }) => (
              <Ionicons name="notifications-outline" size={26} color={todayColor.ink} style={pressed && { opacity: 0.7 }} />
            )}
          </Pressable>
        </View>

        <SoftCard style={{ padding: spacing.lg, marginTop: spacing.xl }}>
          <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 15 }}>
            Your progress
          </AppText>
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <Stat value={overall.days > 0 ? `${overall.days}d` : '—'} label="Days practiced" />
            <Stat value={overall.time} label="Total time" divider />
            <Stat value={`${overall.stars}★`} label="Stars earned" divider />
          </View>
        </SoftCard>

        <SoftCard style={{ padding: spacing.lg, marginTop: spacing.md }}>
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

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {/*<PillButton*/}
          {/*  title="Sing with Instrumental"*/}
          {/*  onPress={() => navigation.navigate('SingTab', { screen: 'InstrumentalUpload' })}*/}
          {/*/>*/}
          <PillButton
            title="Ear Training Exercises"
            variant="soft"
            onPress={() => navigation.navigate('ExercisesTab', { screen: 'ExercisesHub' })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label, divider = false }: { value: string; label: string; divider?: boolean }) {
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
      <AppText color={todayColor.ink} style={{ fontFamily: typography.family.bold, fontSize: 19, letterSpacing: -0.3 }}>
        {value}
      </AppText>
      <AppText color={todayColor.inkSecondary} variant="caption" style={{ fontSize: 12, marginTop: 2 }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}
