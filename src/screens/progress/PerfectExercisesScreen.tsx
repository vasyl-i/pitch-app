import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { perfectExercises, useProgressStore } from '@/features/progress';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { formatDate, useTranslation } from '@/shared/i18n';
import { melodyById } from '@/entities/exercise';
import type { ProgressScreenProps } from '@/app/navigation/types';

type PerfectRun = ReturnType<typeof perfectExercises>[number];

/** Every exercise the singer has nailed with a 3-star run. Rows re-open the exercise. */
export function PerfectExercisesScreen({ navigation }: ProgressScreenProps<'PerfectExercises'>) {
  const { t } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const perfect = useMemo(() => perfectExercises(sessions), [sessions]);

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={navigation.goBack} />
        <View style={styles.fill}>
          <AppText variant="label">{t('progress.perfect.title')}</AppText>
          <AppText variant="caption">{t('progress.perfect.subtitle')}</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {perfect.length === 0 ? (
          <Card style={[styles.card, styles.empty]}>
            <AppText variant="body">{t('progress.perfect.empty')}</AppText>
          </Card>
        ) : (
          perfect.map((run) => (
            <PerfectRunRow key={run.exerciseId} run={run} onPress={() => navigation.navigate('MelodyPractice', { exerciseId: run.exerciseId })} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function PerfectRunRow({ run, onPress }: { run: PerfectRun; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowSlot}>
      {({ pressed }) => (
        <Card style={[styles.card, styles.row, pressed && styles.pressed]}>
          <IconBubble name="trophy" size={40} iconSize={18} />
          <View style={styles.fill}>
            <AppText variant="label">{melodyById(run.exerciseId)?.title ?? run.title}</AppText>
            <AppText variant="caption" style={styles.meta}>
              {t('progress.perfect.meta', {
                best: run.bestScore,
                runs: t('progress.perfect.runs', { count: run.perfectRuns }),
                date: formatDate(new Date(run.lastAt), { month: 'short', day: 'numeric' }),
              })}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fill: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  card: { padding: 18 },
  empty: { marginTop: spacing.lg },
  rowSlot: { marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.85 },
  meta: { marginTop: 2 },
});
