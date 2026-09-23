/**
 * Onboarding step 2: pick which areas the user wants to improve.
 * Multi-select, skip-able. Choices influence daily/weekly exercise mix
 * via `improvementGoals` in learning preferences.
 */
import { useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IMPROVEMENT_GOAL_LABELS, type ImprovementGoal, usePreferencesStore, } from '@/features/learning';
import { useProfileStore } from '@/entities/profile';
import { AppText, Button, ProgressCircle, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const GOAL_OPTIONS: { id: ImprovementGoal; icon: ImageSourcePropType }[] = [
    { id: 'sing-in-tune', icon: require('../../../assets/onboarding/tune.png') },
    { id: 'hit-notes', icon: require('../../../assets/onboarding/note.png') },
    { id: 'feel-confident', icon: require('../../../assets/onboarding/perfomance.png') },
];

/** Map onboarding improvement goals to the primary learning goal for the lesson generator. */
function derivePrimaryGoal(goals: ImprovementGoal[]): 'sing-in-tune' | 'train-ear' | 'vocal-control' {
    if (goals.includes('sing-in-tune')) return 'sing-in-tune';
    if (goals.includes('hit-notes')) return 'train-ear';
    return 'vocal-control';
}

export function GoalsScreen({ navigation }: OnboardingScreenProps<'Goals'>) {
    const { palette, spacing, radii, typography } = useTheme();
    const insets = useSafeAreaInsets();
    const setPreferences = usePreferencesStore((s) => s.setPreferences);
    const advanceOnboarding = useProfileStore((s) => s.advanceOnboarding);
    const [selected, setSelected] = useState<ImprovementGoal[]>([]);

    const toggle = (id: ImprovementGoal) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
        );
    };

    const finish = () => {
        if (selected.length > 0) {
            setPreferences({
                improvementGoals: selected,
                primaryGoal: derivePrimaryGoal(selected),
            });
        }
        advanceOnboarding('goals-complete');
        navigation.navigate('Reminder');
    };

    const skip = () => {
        advanceOnboarding('goals-complete');
        navigation.navigate('Reminder');
    };

    return (
        <Screen>
            <View style={[styles.root, {
                paddingBottom: insets.bottom + spacing.lg
            }]}>
                <View  />
                <View>
                    <AppText
                        variant="title"
                        style={{
                            fontSize: 30,
                            textAlign: 'center',
                            fontFamily: typography.family.bold,
                            // marginTop: 60
                        }}
                    >
                        What would you{'\n'}like to improve?
                    </AppText>
                    <AppText
                        variant="body"
                        color={palette.textPrimary}
                        style={{ textAlign: 'center', marginTop: spacing.sm }}
                    >
                        Choose all that apply
                    </AppText>

                    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
                        {GOAL_OPTIONS.map((opt) => {
                            const isSelected = selected.includes(opt.id);
                            return (
                                <Pressable
                                    key={opt.id}
                                    onPress={() => toggle(opt.id)}
                                    style={[
                                        styles.option,
                                        {
                                            backgroundColor: palette.surface,
                                            borderRadius: radii.md,
                                            // borderWidth: 1.5,
                                            // borderColor: isSelected ? palette.accentSecondary : 'transparent',
                                        },
                                    ]}
                                >
                                    <Image source={opt.icon} style={{ width: 52, height: 52 }} resizeMode="contain"/>
                                    <AppText variant="body" style={{
                                        flex: 1,
                                        fontFamily: typography.family.medium,
                                        color: palette.textPrimary
                                    }}>
                                        {IMPROVEMENT_GOAL_LABELS[opt.id]}
                                    </AppText>
                                    {isSelected && (
                                        <ProgressCircle totalRounds={1} completedRounds={1} done={true} size={16} strokeWidth={0.5}/>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View>
                    <Pressable onPress={skip} style={{ alignSelf: 'center', marginBottom: spacing.md }}>
                        <AppText variant="body" color={palette.textPrimary}>
                            Skip
                        </AppText>
                    </Pressable>
                    <Button
                        title="Continue"
                        onPress={finish}
                        disabled={selected.length === 0}
                        style={{ backgroundColor: '#ffffff' }}
                    />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "space-between",
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 24,
        gap: 12,
    },
});
