/**
 * Home: the dashboard — overall progress, today's exercise plan,
 * and the primary entry point into daily practice.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    currentStreak,
    formatPracticeTime,
    todayExerciseStats,
    useProgressStore,
} from '@/features/progress';
import { useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement, usePremiumStatus } from '@/features/subscription';
import { AppText, Screen } from '@/shared/ui';
import { palette, useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { HomeScreenProps } from '@/app/navigation/types';
import type { GuidedStep } from '@/features/learning';
import { ensureTodaysLesson, beginStep, continuePractice, redoStep } from '../session/lessonFlow';
import { TodayBackground } from './TodayBackground';
import { MainBanner } from './ui/MainBanner';
import { ProgressSection } from './ui/ProgressSection';
import { TodayExerciseList } from './ui/TodayExerciseList';

export function TodayScreen({ navigation }: HomeScreenProps<'Today'>) {
    const { spacing, typography } = useTheme();
    const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
    const sessions = useProgressStore((s) => s.sessions);
    const totalPracticeSec = useProgressStore((s) => s.totalPracticeSec);
    const prefs = usePreferencesStore((s) => s.preferences);
    const adaptive = useEntitlement('adaptive-lessons');
    const { trialDaysLeft } = usePremiumStatus();
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
                        text: 'Don\'t show again',
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
        <Screen noHorizontalPadding noBottomPadding>
            <View style={{ paddingHorizontal: spacing.lg, height: "100%" }}>
                <ScrollView showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: tabBarClearance }}>
                    <View style={styles.headingRow}>
                        <AppText
                            color={palette.textPrimary}
                            style={[styles.heading, { fontFamily: typography.family.bold, flex: 1 }]}
                        >
                            Let’s practice 🎧️️
                        </AppText>
                        {trialDaysLeft !== null && trialDaysLeft <= 1 && (
                            <Pressable
                                onPress={() => navigation.navigate('ManageSubscription' as never)}
                                style={styles.trialBanner}
                            >
                                <Ionicons name="alert-circle" size={13} color="#F0943A" />
                                <AppText
                                    variant="caption"
                                    color="#F0943A"
                                    style={{ fontSize: 12, fontFamily: typography.family.medium }}
                                >
                                    Trial ends tomorrow
                                </AppText>
                            </Pressable>
                        )}
                    </View>

                    <MainBanner/>

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
    trialBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(240, 148, 58, 0.14)',
    },
    exerciseList: {
        marginTop: 24,
    },
});
