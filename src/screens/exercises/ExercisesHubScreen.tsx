/**
 * The Exercises tab: every ear-training drill, launchable directly. The same
 * drills also appear inside the guided daily lesson — this tab is the direct
 * door for training your ear on your own terms.
 */
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EXERCISES } from '@/features/ear-training';
import { AppText, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ExercisesScreenProps } from '@/app/navigation/types';
import { DEFAULT_CAT_ICON, EXERCISE_CAT_ICONS } from '../home/ui/exerciseIcons';

export function ExercisesHubScreen({ navigation }: ExercisesScreenProps<'ExercisesHub'>) {
    const { palette, spacing } = useTheme();
    const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
    const [levels, setLevels] = useState<Record<string, string>>({});

    return (
        <Screen noHorizontalPadding noBottomPadding>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                    <AppText color={palette.textPrimary}
                             style={[styles.heading, { fontFamily: typography.family.bold }]}>
                        Exercises
                    </AppText>
                    <AppText variant="body" style={{ marginTop: spacing.xs }}>
                        Train your ear — listen, then sing back.
                    </AppText>
                </View>
                <View style={{ marginTop: spacing.lg }}>
                    {EXERCISES.map((exercise) => {
                        const selected = levels[exercise.id] ?? exercise.defaultDifficulty ?? undefined;
                        const catIcon = EXERCISE_CAT_ICONS[exercise.id] ?? DEFAULT_CAT_ICON;
                        const inset = catIcon.inset ?? 0;
                        const imgSize = ICON_SIZE - inset * 2;
                        return (
                            <Pressable
                                key={exercise.id}
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('EarSession', {
                                    exerciseId: exercise.id,
                                    difficultyId: selected
                                })}
                            >
                                {({ pressed }) => (
                                    <View style={[styles.card, pressed && { opacity: 0.7 }]}>
                                        <View style={styles.row}>
                                            <View style={styles.iconContainer}>
                                                <Image source={catIcon.source}
                                                       style={{ width: imgSize, height: imgSize }}
                                                       resizeMode="contain"/>
                                            </View>
                                            <View style={styles.info}>
                                                <AppText variant="label" style={{ fontSize: 16 }}>
                                                    {exercise.title}
                                                </AppText>
                                                <AppText variant="caption" style={{ marginTop: 3 }}>
                                                    {exercise.tagline}
                                                </AppText>
                                            </View>
                                        </View>
                                        {exercise.difficulties && (
                                            <View style={styles.chips}>
                                                {exercise.difficulties.map((level) => {
                                                    const isSelected = level.id === selected;
                                                    return (
                                                        <Pressable
                                                            key={level.id}
                                                            accessibilityRole="button"
                                                            accessibilityState={{ selected: isSelected }}
                                                            onPress={() => setLevels((prev) => ({
                                                                ...prev,
                                                                [exercise.id]: level.id
                                                            }))}
                                                            style={[
                                                                styles.chip,
                                                                { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                                                            ]}
                                                        >
                                                            <AppText variant="caption"
                                                                     color={isSelected ? palette.accent : palette.textSecondary}>
                                                                {level.label}
                                                            </AppText>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </Screen>
    );
}

const ICON_SIZE = 64;
const ICON_RADIUS = 14;

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: ICON_RADIUS,
        backgroundColor: '#1E1D1F',
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    heading: {
        fontSize: 24,
        lineHeight: 28,
    },
    info: { flex: 1, marginLeft: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
