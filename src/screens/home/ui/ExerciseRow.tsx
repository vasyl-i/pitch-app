/**
 * A single exercise card in the daily exercises list. Shows an icon square,
 * title, difficulty, and status/accuracy on the right. Card-style with
 * translucent surface background.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import type { GuidedStep } from '@/features/learning';
import { SLOT_LABELS, guidedStepTitle } from '@/features/learning';
import type { TodayExerciseStat } from '@/features/progress';
import { AppText, ProgressCircle } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';
import { EXERCISE_DESCRIPTIONS } from './exerciseIcons';
import { ExerciseIcon } from '../../exercises/ui/ExerciseIcon';

type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

const ICON_SIZE = 56;

export function ExerciseRow({ step, status, partialRounds, onPress }: {
  step: GuidedStep;
  status: StepStatus;
  index: number;
  stat: TodayExerciseStat | undefined;
  partialRounds?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const done = status === 'completed';
  const description =
    EXERCISE_DESCRIPTIONS[step.activityId] ??
    `${SLOT_LABELS[step.slot] ?? t('home.practice')} · ${t('common.minutesShort', { count: step.estMinutes })}`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={done && styles.done}>
        <ExerciseIcon id={step.activityId} size={ICON_SIZE} radius={14} color={palette.iconWell} />
      </View>

      <View style={[styles.text, done && styles.done]}>
        <AppText variant="subtitle" weight="bold" color={todayColor.ink} numberOfLines={1}>
          {guidedStepTitle(step)}
        </AppText>
        <AppText variant="small" color={todayColor.inkFaint} numberOfLines={1} style={styles.description}>
          {description}
        </AppText>
      </View>

      <ProgressCircle
        completedRounds={done ? step.totalRounds : (partialRounds ?? 0)}
        totalRounds={step.totalRounds}
        done={done}
        trackColor={todayColor.inkSecondary}
        progressColor={todayColor.orange}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  pressed: { opacity: 0.7 },
  done: { opacity: 0.4 },
  text: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  description: { marginTop: 6 },
});
