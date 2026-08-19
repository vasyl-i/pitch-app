import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { perfectExercises, useProgressStore } from '@/features/progress';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

/** Every exercise the singer has nailed with a 3-star run. Rows re-open the exercise. */
export function PerfectExercisesScreen({ navigation }: ProfileScreenProps<'PerfectExercises'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const perfect = useMemo(() => perfectExercises(sessions), [sessions]);

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">Perfect tasks</AppText>
          <AppText variant="caption">Exercises you’ve completed with a 3-star run</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {perfect.length === 0 ? (
          <Card style={[styles.card, { marginTop: spacing.lg }]}>
            <AppText variant="body">
              Nothing here yet. Score 90 or higher on any exercise to earn 3 stars and it will show up on this list.
            </AppText>
          </Card>
        ) : (
          perfect.map((p) => (
            <Pressable
              key={p.exerciseId}
              accessibilityRole="button"
              onPress={() => navigation.navigate('MelodyPractice', { exerciseId: p.exerciseId })}
              style={{ marginTop: spacing.md }}
            >
              {({ pressed }) => (
                <Card style={[styles.card, styles.row, pressed && { opacity: 0.85 }]}>
                  <IconBubble name="trophy" size={40} iconSize={18} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{p.title}</AppText>
                    <AppText variant="caption" style={{ marginTop: 2 }}>
                      Best {p.bestScore} · {p.perfectRuns === 1 ? '1 perfect run' : `${p.perfectRuns} perfect runs`} ·{' '}
                      {new Date(p.lastAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
                </Card>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
