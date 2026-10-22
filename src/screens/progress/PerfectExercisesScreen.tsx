import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { perfectExercises, useProgressStore } from '@/features/progress';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { formatDate, useTranslation } from '@/shared/i18n';
import { melodyById } from '@/entities/exercise';
import type { ProgressScreenProps } from '@/app/navigation/types';

/** Every exercise the singer has nailed with a 3-star run. Rows re-open the exercise. */
export function PerfectExercisesScreen({ navigation }: ProgressScreenProps<'PerfectExercises'>) {
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const perfect = useMemo(() => perfectExercises(sessions), [sessions]);

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">{t('progress.perfect.title')}</AppText>
          <AppText variant="caption">{t('progress.perfect.subtitle')}</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {perfect.length === 0 ? (
          <Card style={[styles.card, { marginTop: spacing.lg }]}>
            <AppText variant="body">
              {t('progress.perfect.empty')}
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
                    <AppText variant="label">{melodyById(p.exerciseId)?.title ?? p.title}</AppText>
                    <AppText variant="caption" style={{ marginTop: 2 }}>
                      {t('progress.perfect.meta', {
                        best: p.bestScore,
                        runs: t('progress.perfect.runs', { count: p.perfectRuns }),
                        date: formatDate(new Date(p.lastAt), { month: 'short', day: 'numeric' }),
                      })}
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
