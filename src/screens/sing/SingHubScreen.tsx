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
import { useTranslation } from '@/shared/i18n';
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

export function SingHubScreen({ navigation }: SingScreenProps<'SingHub'>) {
  const { t } = useTranslation();
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
      .filter((n) => n.count >= 5 && Math.abs(n.avgCents) >= 20)
      .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents))[0];
    if (!strongest) return undefined;
    const params = { note: strongest.name, cents: Math.round(Math.abs(strongest.avgCents)) };
    return strongest.avgCents > 0 ? t('sing.hub.coachTeaserSharp', params) : t('sing.hub.coachTeaserFlat', params);
  }, [sessions, t]);

  const next = planReady ? nextGuidedStep({ steps, completedSlots }) : null;
  const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
  const allDone = planReady && steps.length > 0 && next === null;

  const heroTitle = adaptive && weeklyFocus ? FOCUS_TITLES[weeklyFocus.skill] : t('sing.hub.heroTitle');

  return (
    <Screen backdrop={<TodayBackground />} noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <AppText
          color={todayColor.ink}
          style={{ fontFamily: typography.family.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 }}
        >
          {t('sing.hub.title')}
        </AppText>

        <View style={{ marginTop: spacing.xl }}>
          <HeroFocusCard eyebrow={t('sing.hub.weekFocus')} title={heroTitle} subcopy={t('sing.hub.heroSubcopy')} />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 16, marginBottom: spacing.md }}>
            {t('sing.hub.dailyProgress')}
          </AppText>
          <DailyStats accuracy={todayStats.accuracy} streak={streak} practiceLabel={todayStats.practiceLabel} />
        </View>

        {/* existing users who skipped onboarding goals: one doorway to set one */}
        {!prefs && (
          <View style={{ marginTop: spacing.xl }}>
            <SoftRow
              icon="flag"
              title={t('sing.hub.setGoal')}
              subtitle={t('sing.hub.setGoalSubtitle')}
              onPress={() => navigation.navigate('LearningPreferences')}
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
            onViewAll={() => navigation.navigate('ExercisesTab', { screen: 'ExercisesHub' })}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SoftRow
            icon="cloud-upload"
            title={t('sing.upload.title')}
            subtitle={t('sing.hub.instrumentalSubtitle')}
            onPress={() => navigation.navigate('InstrumentalUpload')}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <PremiumGate
            feature="ai-session-feedback"
            source="today-coach-card"
            fallback={(openPaywall) => (
              <LightLockedCard
                title={t('sing.hub.coachLockedTitle')}
                description={t('sing.hub.coachLockedBody')}
                preview={coachTeaser}
                cta={t('sing.hub.coachLockedCta')}
                onPress={openPaywall}
              />
            )}
          >
            <SoftCard tint={todayColor.indigoTint} style={{ padding: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 15 }}>
                  {t('sing.hub.yourCoach')}
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
                title={t('sing.hub.weakSpotsTitle')}
                description={t('sing.hub.weakSpotsLockedBody')}
                bullets={[t('sing.hub.weakSpotsBullet1'), t('sing.hub.weakSpotsBullet2'), t('sing.hub.weakSpotsBullet3')]}
                onPress={openPaywall}
              />
            )}
          >
            <SoftRow
              icon="analytics"
              title={t('sing.hub.weakSpotsTitle')}
              subtitle={t('sing.hub.weakSpotsSubtitle')}
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
              title={t('sing.hub.forFun')}
              onPress={() => navigation.navigate('ExercisesTab', { screen: 'ExercisesHub' })}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
