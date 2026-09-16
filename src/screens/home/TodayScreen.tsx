/**
 * Home: the dashboard — overall progress, today's exercise plan,
 * and the primary entry point into daily practice.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
    currentStreak,
    formatPracticeTime,
    todayExerciseStats,
    totalPracticeSeconds,
    useProgressStore,
} from '@/features/progress';
import { useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { useEntitlement } from '@/features/subscription';
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
            time: formatPracticeTime(totalPracticeSeconds(sessions)),
            streak: currentStreak(sessions),
            accuracy: sessions.length > 0
                ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
                : 0,
        }),
        [sessions],
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
        <Screen backdrop={<TodayBackground/>} noHorizontalPadding noBottomPadding>
            <View style={{ paddingHorizontal: spacing.lg }}>
                <ScrollView showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: tabBarClearance }}>
                    <AppText
                        color={palette.textPrimary}
                        style={[styles.heading, { fontFamily: typography.family.bold }]}
                    >
                        Let’s practice 🎧️️
                    </AppText>

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
    heading: {
        fontSize: 24,
        lineHeight: 28,
    },
    exerciseList: {
        marginTop: 24,
    },
});
