/**
 * Home: the dashboard — overall progress, today's exercise plan,
 * and the primary entry point into daily practice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
    currentStreak,
    formatPracticeTime,
    todayExerciseStats,
    useProgressStore,
} from '@/features/progress';
import { useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement } from '@/features/subscription';
import { AppText, Screen } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';
import { palette, useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import type { GuidedStep } from '@/features/learning';
import { ensureTodaysLesson, beginStep, continuePractice, redoStep } from '../session/lessonFlow';
import { TodayBackground } from './TodayBackground';
import { PremiumBanner } from '@/screens/subscription';
import { ProgressSection } from './ui/ProgressSection';
import { TodayExerciseList } from './ui/TodayExerciseList';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
    const { t } = useTranslation();
    const { spacing, typography } = useTheme();
    const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
    const sessions = useProgressStore((s) => s.sessions);
    const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
    const prefs = usePreferencesStore((s) => s.preferences);
    const adaptive = useEntitlement('adaptive-lessons');
    const steps = useLessonSessionStore((s) => s.steps);
    const completedSlots = useLessonSessionStore((s) => s.completedSlots);

    const [planReady, setPlanReady] = useState(false);
    useEffect(() => {
        ensureTodaysLesson(() => setPlanReady(true));
    }, [prefs, adaptive]);

    const overall = useMemo(
        () => ({
            time: formatPracticeTime(totalPracticeSec),
            streak: currentStreak(sessions),
            accuracy: sessions.length > 0
                ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
                : 0,
        }),
        [sessions, totalPracticeSec],
    );
    const todayStats = useMemo(() => todayExerciseStats(sessions), [sessions]);

    const doneCount = steps.filter((s) => completedSlots.includes(s.slot)).length;
    const allDone = planReady && steps.length > 0 && doneCount === steps.length;
    const skipRedoWarning = prefs?.skipRedoWarning ?? false;

    // DEV: triple-tap heading to open DevMenu
    const devTapRef = useRef({ count: 0, lastTap: 0 });
    const handleDevTap = __DEV__
        ? () => {
              const now = Date.now();
              if (now - devTapRef.current.lastTap > 500) devTapRef.current.count = 0;
              devTapRef.current.lastTap = now;
              devTapRef.current.count += 1;
              if (devTapRef.current.count >= 3) {
                  devTapRef.current.count = 0;
                  navigation.navigate('DevMenu' as never);
              }
          }
        : undefined;

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
                t('home.redo.title'),
                t('home.redo.message'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('common.dontShowAgain'),
                        onPress: () => {
                            usePreferencesStore.getState().setPreferences({ skipRedoWarning: true });
                            redoStep(step, navigation);
                        },
                    },
                    { text: t('common.continue'), onPress: () => redoStep(step, navigation) },
                ],
            );
        },
        [completedSlots, skipRedoWarning, navigation, t],
    );

    return (
        <Screen noHorizontalPadding noBottomPadding>
            <View style={{ height: "100%" }}>
                {/* horizontal padding lives on the content so the scroll view doesn't
                    clip the trial reminder poking past the banner's right edge */}
                <ScrollView showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarClearance }}>
                    <View style={styles.headingRow}>
                        <Pressable onPress={handleDevTap} style={{ flex: 1 }}>
                            <AppText
                                color={palette.textPrimary}
                                style={[styles.heading, { fontFamily: typography.family.bold }]}
                            >
                                {t('home.heading')}
                            </AppText>
                        </Pressable>
                    </View>

                    <PremiumBanner source="today" style={{ marginTop: 16 }} />

                    <ProgressSection
                        accuracy={overall.accuracy}
                        streak={overall.streak}
                        practiceTime={overall.time}
                    />

                    <View style={styles.exerciseList}>
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
                </ScrollView>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    headingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heading: {
        fontSize: 24,
        lineHeight: 28,
    },
    exerciseList: {
        marginTop: 24,
    },
});
