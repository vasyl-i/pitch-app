/**
 * The Exercises tab: every ear-training drill, launchable directly. The same
 * drills also appear inside the guided daily lesson — this tab is the direct
 * door for training your ear on your own terms.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EXERCISES } from '@/features/ear-training';
import { AppText, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ExercisesScreenProps } from '@/app/navigation/types';

export function ExercisesHubScreen({ navigation }: ExercisesScreenProps<'ExercisesHub'>) {
  const { palette, spacing } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const [levels, setLevels] = useState<Record<string, string>>({});

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <AppText variant="title" style={{ fontSize: 40 }}>
          Exercises
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Train your ear — listen, then sing back.
        </AppText>

        <View style={{ marginTop: spacing.lg }}>
          {EXERCISES.map((exercise) => {
            const selected = levels[exercise.id] ?? exercise.defaultDifficulty ?? undefined;
            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('EarSession', { exerciseId: exercise.id, difficultyId: selected })}
              >
                {({ pressed }) => (
                  <Card style={[styles.card, pressed && { opacity: 0.85 }]}>
                    <AppText variant="label" style={{ fontSize: 16 }}>
                      {exercise.title}
                    </AppText>
                    <AppText variant="caption" style={{ marginTop: 3 }}>
                      {exercise.tagline}
                    </AppText>
                    {exercise.difficulties && (
                      <View style={styles.chips}>
                        {exercise.difficulties.map((level) => {
                          const isSelected = level.id === selected;
                          return (
                            <Pressable
                              key={level.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => setLevels((prev) => ({ ...prev, [exercise.id]: level.id }))}
                              style={[
                                styles.chip,
                                { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                              ]}
                            >
                              <AppText variant="caption" color={isSelected ? palette.accent : palette.textSecondary}>
                                {level.label}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </Card>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
