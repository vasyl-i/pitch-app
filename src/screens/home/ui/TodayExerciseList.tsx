/**
 * The daily exercises list for the TodayScreen. Shows today's lesson steps
 * as a vertical list with per-exercise status, a thin progress bar, and a
 * primary CTA to start/continue practice.
 */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep, LessonSlot } from '@/features/learning';
import { useLessonSessionStore } from '@/features/learning';
import type { TodayExerciseStat } from '@/features/progress';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';
import { ExerciseRow } from './ExerciseRow';
import { PillButton } from './PillButton';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

export function TodayExerciseList({
                                      steps,
                                      completedSlots,
                                      planReady,
                                      allDone,
                                      doneCount,
                                      onPrimaryAction,
                                      onStepPress,
                                      todayStats,
                                      delay,
                                  }: {
    steps: GuidedStep[];
    completedSlots: LessonSlot[];
    planReady: boolean;
    allDone: boolean;
    doneCount: number;
    onPrimaryAction: () => void;
    onStepPress: (step: GuidedStep) => void;
    todayStats: Map<string, TodayExerciseStat>;
    delay: number;
}) {
    const { t } = useTranslation();
    const activeSlot = useLessonSessionStore((s) => s.activeSlot);
    const partialProgress = useLessonSessionStore((s) => s.partialProgress);
    const nextSlot = steps.find((s) => !completedSlots.includes(s.slot))?.slot ?? null;
    const progress = steps.length > 0 ? doneCount / steps.length : 0;

    const statusOf = (step: GuidedStep): StepStatus =>
        completedSlots.includes(step.slot)
            ? 'completed'
            : step.slot === activeSlot
                ? 'in-progress'
                : step.slot === nextSlot
                    ? 'ready'
                    : 'upcoming';

    return (
        <View>
            <Animated.View entering={FadeInRight.delay(delay + 100)}>
            <View style={styles.header}>
                <AppText variant="label" weight="medium" color={todayColor.ink}>
                    {t('home.plan.title')}
                </AppText>
                <AppText variant="small" weight="medium" color={todayColor.inkSecondary}>
                    {doneCount}/{steps.length}
                </AppText>
            </View>
            </Animated.View>

            <Animated.View entering={FadeInRight.delay(delay + 200)}>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}/>
            </View>
            </Animated.View>

            <View style={styles.rows}>
                {!planReady && steps.length === 0 ? (
                    <AppText variant="caption" color={todayColor.inkSecondary} center style={styles.preparing}>
                        {t('home.plan.preparing')}
                    </AppText>
                ) : (
                    steps.map((step, i) => (
                        <Animated.View entering={FadeInRight.delay(delay + 300 + (100 * (i + 1)))}>
                            <ExerciseRow
                                key={step.slot}
                                step={step}
                                status={statusOf(step)}
                                index={i}
                                stat={todayStats.get(step.activityId)}
                                partialRounds={partialProgress[step.slot]?.completedRounds}
                                onPress={() => onStepPress(step)}
                            />
                        </Animated.View>
                    ))
                )}
            </View>

            <Animated.View entering={FadeInDown.delay(300 + steps.length * 100 + 200)}>
            <View style={styles.cta}>
                {allDone ? (
                    <View style={styles.complete}>
                        <Ionicons name="checkmark-circle" size={20} color={todayColor.orange}/>
                        <AppText variant="small" color={todayColor.inkSecondary} style={styles.completeText}>
                            {t('home.plan.complete')}
                        </AppText>
                    </View>
                ) : (
                    <PillButton
                        title={doneCount > 0 ? t('home.plan.continue') : t('home.plan.start')}
                        disabled={!planReady || steps.length === 0}
                        onPress={onPrimaryAction}
                    />
                )}
            </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressTrack: {
        height: 3,
        borderRadius: 1.5,
        backgroundColor: todayColor.surfaceMuted,
        marginTop: spacing.sm,
        overflow: 'hidden'
    },
    progressFill: { height: 3, borderRadius: 1.5, backgroundColor: todayColor.orange },
    rows: { marginTop: spacing.md },
    preparing: { paddingVertical: spacing.lg },
    cta: { marginTop: spacing.lg },
    complete: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    completeText: { flex: 1 },
});
