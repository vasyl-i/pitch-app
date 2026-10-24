/**
 * Sing. The tab for singing practice: today's guided lesson plus singing
 * along to an uploaded instrumental. The guided plan funnels into one
 * action: Continue today's practice. Everything else here is coaching
 * context: this week's focus, the coach's note, your streak.
 *
 * Visual language is scoped to this screen only (see `todayPalette.ts`) — a
 * darker, more atmospheric variant of the app's shared dark-glass system.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { PremiumGate } from '@/features/subscription';
import { RangeSuggestionBanner } from '@/features/vocal-range';
import { AppText, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { SingScreenProps } from '@/app/navigation/types';
import { beginStep, continuePractice } from '../../session/lessonFlow';
import { TodayBackground } from '../../home/TodayBackground';
import { todayColor } from '../../home/todayPalette';
import { DailyStats } from '../../home/ui/DailyStats';
import { HeroFocusCard } from '../../home/ui/HeroFocusCard';
import { LightLockedCard } from '../../home/ui/LightLockedCard';
import { PillButton } from '../../home/ui/PillButton';
import { PlanCard } from '../../home/ui/PlanCard';
import { SoftRow } from '../../home/ui/SoftRow';
import { useSingHub } from './useSingHub';
import { CoachSection } from './CoachSection';

export function SingHubScreen({ navigation }: SingScreenProps<'SingHub'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const hub = useSingHub();
  const openLibrary = () => navigation.navigate('ExercisesTab', { screen: 'ExercisesHub' });

  return (
    <Screen backdrop={<TodayBackground />} noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <AppText variant="score" color={todayColor.ink} style={styles.title}>
          {t('sing.hub.title')}
        </AppText>

        <View style={styles.section}>
          <HeroFocusCard eyebrow={t('sing.hub.weekFocus')} title={hub.heroTitle} subcopy={t('sing.hub.heroSubcopy')} />
        </View>

        <View style={styles.section}>
          <AppText variant="label" weight="medium" color={todayColor.ink} style={styles.sectionTitle}>
            {t('sing.hub.dailyProgress')}
          </AppText>
          <DailyStats accuracy={hub.todayStats.accuracy} streak={hub.streak} practiceLabel={hub.todayStats.practiceLabel} />
        </View>

        {/* existing users who skipped onboarding goals: one doorway to set one */}
        {!hub.hasPrefs && (
          <View style={styles.section}>
            <SoftRow icon="flag" title={t('sing.hub.setGoal')} subtitle={t('sing.hub.setGoalSubtitle')} onPress={() => navigation.navigate('LearningPreferences')} />
          </View>
        )}

        <View style={styles.section}>
          <PlanCard
            steps={hub.steps}
            completedSlots={hub.completedSlots}
            planReady={hub.planReady}
            allDone={hub.allDone}
            doneCount={hub.doneCount}
            onPrimaryAction={() => continuePractice(navigation)}
            onStepPress={(step) => beginStep(step, navigation)}
            onViewAll={openLibrary}
          />
        </View>

        <View style={styles.section}>
          <SoftRow icon="cloud-upload" title={t('sing.upload.title')} subtitle={t('sing.hub.instrumentalSubtitle')} onPress={() => navigation.navigate('InstrumentalUpload')} />
        </View>

        <View style={styles.section}>
          <CoachSection message={hub.coach} teaser={hub.coachTeaser} />
        </View>

        <View style={styles.subsection}>
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
            <SoftRow icon="analytics" title={t('sing.hub.weakSpotsTitle')} subtitle={t('sing.hub.weakSpotsSubtitle')} onPress={() => navigation.navigate('WeakSpots')} />
          </PremiumGate>
        </View>

        <View style={styles.subsection}>
          <RangeSuggestionBanner />
        </View>

        {hub.allDone && (
          <View style={styles.forFun}>
            <PillButton title={t('sing.hub.forFun')} onPress={openLibrary} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.8 },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  subsection: { marginTop: spacing.lg },
  forFun: { marginTop: spacing.md },
});
