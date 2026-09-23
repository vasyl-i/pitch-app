/**
 * A single exercise card in the daily exercises list. Shows an icon square,
 * title, difficulty, and status/accuracy on the right. Card-style with
 * translucent surface background.
 */
import { Image, Pressable, View } from 'react-native';
import type { GuidedStep } from '@/features/learning';
import { SLOT_LABELS } from '@/features/learning';
import type { TodayExerciseStat } from '@/features/progress';
import { AppText, ProgressCircle } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { EXERCISE_CAT_ICONS, DEFAULT_CAT_ICON, EXERCISE_DESCRIPTIONS } from './exerciseIcons';

type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

export function ExerciseRow({
  step,
  status,
  index,
  stat,
  partialRounds,
  onPress,
}: {
  step: GuidedStep;
  status: StepStatus;
  index: number;
  stat: TodayExerciseStat | undefined;
  partialRounds?: number;
  onPress: () => void;
}) {
  const { typography, spacing, radii } = useTheme();
  const done = status === 'completed';
  const catIcon = EXERCISE_CAT_ICONS[step.activityId] ?? DEFAULT_CAT_ICON;
  const inset = catIcon.inset ?? 0;
  const imgSize = 56 - inset * 2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Icon square */}
      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#1E1D1F', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', opacity: done ? 0.4 : 1 }}>
        <Image source={catIcon.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
      </View>

      {/* Title + meta */}
      <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm, opacity: done ? 0.4 : 1 }}>
        <AppText
          color={todayColor.ink}
          style={{
            fontFamily: typography.family.bold,
            fontSize: 18,
            lineHeight: 20,
          }}
          numberOfLines={1}
        >
          {step.title}
        </AppText>
        <AppText
          color={todayColor.inkFaint}
          style={{ fontFamily: typography.family.regular, fontSize: 14, lineHeight: 16, marginTop: 6 }}
          numberOfLines={1}
        >
          {EXERCISE_DESCRIPTIONS[step.activityId] ?? `${SLOT_LABELS[step.slot]} · ${step.estMinutes} min`}
        </AppText>
      </View>

      {/* Right: progress circle */}
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
