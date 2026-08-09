/**
 * Sing. The tab for singing practice: today's guided lesson (moved here from
 * the old Home screen — Home is now just the dashboard + launcher) plus
 * singing along to an uploaded instrumental. The guided plan funnels into one
 * action: Continue today's practice. Steps are milestones of today's
 * session, not a menu. Everything else here is coaching context: this week's
 * focus, the coach's note, your streak.
 *
 * Visual language is scoped to this screen only (see `todayPalette.ts`) — a
 * darker, more atmospheric variant of the app's shared dark-glass system,
 * which every other screen still uses untouched.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  FOCUS_TITLES,
  buildCoachMessage,
  nextGuidedStep,
  useLearningStore,
  useLessonSessionStore,
  usePreferencesStore,
} from '@/features/learning';
import { currentStreak, localDayKey, noteHeatmap, totalPracticeSeconds, formatPracticeTime, useProgressStore } from '@/features/progress';
import { PremiumGate, useEntitlement } from '@/features/subscription';
import { RangeSuggestionBanner } from '@/features/vocal-range';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { SingScreenProps } from '@/app/navigation/types';
import { beginStep, continuePractice, ensureTodaysLesson } from '../session/lessonFlow';
import { TodayBackground } from '../home/TodayBackground';
import { todayColor } from '../home/todayPalette';
import { DailyStats } from '../home/ui/DailyStats';
import { HeroFocusCard } from '../home/ui/HeroFocusCard';
import { LightLockedCard } from '../home/ui/LightLockedCard';
import { LightPremiumBadge } from '../home/ui/LightPremiumBadge';
import { PillButton } from '../home/ui/PillButton';
import { PlanCard } from '../home/ui/PlanCard';
import { SoftCard } from '../home/ui/SoftCard';
import { SoftRow } from '../home/ui/SoftRow';

const GENERIC_HERO_TITLE = 'Build a consistent habit';
const GENERIC_HERO_SUBCOPY = 'Practice a little every day and see the difference.';

export function SingHubScreen({ navigation }: SingScreenProps<'SingHub'>) {
  const { spacing, typography } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const weeklyFocus = useLearningStore((s) => s.weeklyFocus);
  const prefs = usePreferencesStore((s) => s.preferences);
  const adaptive = useEntitlement('adaptive-lessons');

  const steps = useLessonSessionStore((s) => s.steps);
  const completedSlots = useLessonSessionStore((s) => s.completedSlots);

  // snapshot today's plan once all persisted stores are hydrated
  const [planReady, setPlanReady] = useState(false);
  useEffect(() => {
    ensureTodaysLesson(() => setPlanReady(true));
    // `adaptive` is a dependency because upgrading must rebuild today's plan
    // immediately — see `planKey` in lessonFlow
  }, [prefs, adaptive]);

  const streak = useMemo(() => currentStreak(sessions), [sessions]);
  const coach = useMemo(
    () => buildCoachMessage(skills, noteHeatmap(sessions), annotations),
    [skills, sessions, annotations]
  );

  const todayStats = useMemo(() => {
    const todayKey = localDayKey(Date.now());
    const todaySessions = sessions.filter((s) => localDayKey(s.at) === todayKey);
    const accuracy =
      todaySessions.length > 0
        ? Math.round(todaySessions.reduce((sum, s) => sum + s.score, 0) / todaySessions.length)
        : null;
    return { accuracy, practiceLabel: formatPracticeTime(totalPracticeSeconds(todaySessions)) };
  }, [sessions]);

  /**
   * A real, measured line for the locked coach card — never a mock-up. If the
   * history doesn't yet support a specific claim this stays undefined and the
   * card simply omits the preview, because a fabricated "insight" on a paywall
   * is a promise the product then has to keep.
   */
  const coachTeaser = useMemo(() => {
    const strongest = noteHeatmap(sessions)
      .filter((t) => t.count >= 5 && Math.abs(t.avgCents) >= 20)
      .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents))[0];
    if (!strongest) return undefined;
    const direction = strongest.avgCents > 0 ? 'sharp' : 'flat';
    return `Already measured: on ${strongest.name} you average ${Math.round(Math.abs(strongest.avgCents))}¢ ${direction}.`;
  }, [sessions]);

  const next = planReady ? nextGuidedStep({ steps, completedSlots }) : null;
  const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
  const allDone = planReady && steps.length > 0 && next === null;

  const heroTitle = adaptive && weeklyFocus ? FOCUS_TITLES[weeklyFocus.skill] : GENERIC_HERO_TITLE;

  return (
    <Screen backdrop={<TodayBackground />}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <AppText
          color={todayColor.ink}
          style={{ fontFamily: typography.family.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 }}
        >
          Sing
        </AppText>

        <View style={{ marginTop: spacing.xl }}>
          <HeroFocusCard eyebrow="This week's focus" title={heroTitle} subcopy={GENERIC_HERO_SUBCOPY} />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 16, marginBottom: spacing.md }}>
            Daily progress
          </AppText>
          <DailyStats accuracy={todayStats.accuracy} streak={streak} practiceLabel={todayStats.practiceLabel} />
        </View>

        {/* existing users who skipped onboarding goals: one doorway to set one */}
        {!prefs && (
          <View style={{ marginTop: spacing.xl }}>
            <SoftRow
              icon="flag"
              title="Set your goal"
              subtitle="Tell us what you're working toward — your daily practice is built around it."
              onPress={() => navigation.navigate('AccountTab', { screen: 'LearningPreferences' })}
            />
          </View>
        )}

        <View style={{ marginTop: spacing.xl }}>
          <PlanCard
            steps={steps}
            completedSlots={completedSlots}
            planReady={planReady}
            allDone={allDone}
            doneCount={doneCount}
            onPrimaryAction={() => continuePractice(navigation)}
            onStepPress={(step) => beginStep(step, navigation)}
            onViewAll={() => navigation.navigate('AccountTab', { screen: 'PracticeLibrary' })}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SoftRow
            icon="cloud-upload"
            title="Sing with instrumental"
            subtitle="Upload a backing track — we'll detect its key and grade you against it"
            onPress={() => navigation.navigate('InstrumentalUpload')}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <PremiumGate
            feature="ai-session-feedback"
            source="today-coach-card"
            fallback={(openPaywall) => (
              <LightLockedCard
                title="Your AI vocal coach"
                description="Get a read on every session — what improved, what slipped, and the one thing worth fixing next."
                preview={coachTeaser}
                cta="Meet your coach"
                onPress={openPaywall}
              />
            )}
          >
            <SoftCard tint={todayColor.indigoTint} style={{ padding: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 15 }}>
                  Your coach
                </AppText>
                <LightPremiumBadge />
              </View>
              <AppText color={todayColor.ink} style={{ marginTop: 8, fontSize: 14.5, lineHeight: 21 }}>
                {coach}
              </AppText>
            </SoftCard>
          </PremiumGate>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <PremiumGate
            feature="weak-spot-training"
            source="weak-spots"
            fallback={(openPaywall) => (
              <LightLockedCard
                title="Practice your weak spots"
                description="Drills generated from the exact intervals, notes and transitions you keep missing — not a generic plan."
                bullets={['Named from your own history', 'Updates as you improve', 'Every drill shows its evidence']}
                onPress={openPaywall}
              />
            )}
          >
            <SoftRow
              icon="analytics"
              title="Practice your weak spots"
              subtitle="Drills built from what you keep slipping on"
              onPress={() => navigation.navigate('WeakSpots')}
            />
          </PremiumGate>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <RangeSuggestionBanner />
        </View>

        {allDone && (
          <View style={{ marginTop: spacing.md }}>
            <PillButton
              title="Sing something for fun"
              onPress={() => navigation.navigate('AccountTab', { screen: 'PracticeLibrary' })}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
