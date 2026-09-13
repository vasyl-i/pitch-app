/**
 * A single exercise card in the daily exercises list. Shows an icon square,
 * title, difficulty, and status/accuracy on the right. Card-style with
 * translucent surface background.
 */
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep } from '@/features/learning';
import { SLOT_LABELS } from '@/features/learning';
import type { TodayExerciseStat } from '@/features/progress';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { exerciseIcon } from './exerciseIcons';

type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

const ACC_RED = '#EE6B5B';
const ACC_ORANGE = '#F0A840';
const ACC_GREEN = '#7AD45E';

function accuracyColor(score: number): string {
  if (score < 50) return ACC_RED;
  if (score < 75) return ACC_ORANGE;
  return ACC_GREEN;
}

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
  const icon = exerciseIcon(step.activityId, step.kind, index);

  const rowOpacity = status === 'upcoming' ? 0.5 : 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : todayColor.surface,
        opacity: rowOpacity,
      })}
    >
      {/* Icon square — always shows the exercise icon */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: icon.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon.name} size={22} color={icon.glyph} />
      </View>

      {/* Title + meta */}
      <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
        <AppText
          color={done ? todayColor.inkSecondary : todayColor.ink}
          style={{
            fontFamily: typography.family.medium,
            fontSize: 15,
            lineHeight: 20,
          }}
          numberOfLines={1}
        >
          {step.title}
        </AppText>
        <AppText
          color={todayColor.inkFaint}
          style={{ fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16, marginTop: 3 }}
          numberOfLines={1}
        >
          {SLOT_LABELS[step.slot]}{step.difficultyId ? ` · ${step.difficultyId}` : ''} · {done ? `${step.totalRounds}/${step.totalRounds} rounds` : partialRounds ? `${partialRounds}/${step.totalRounds} rounds` : `${step.totalRounds} rounds`} · {step.estMinutes} min
        </AppText>
      </View>

      {/* Right: checkmark, accuracy, or ready dot */}
      <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
        {done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {stat && (
              <AppText
                color={accuracyColor(stat.avgScore)}
                style={{ fontFamily: typography.family.bold, fontSize: 13, lineHeight: 18 }}
              >
                Acc. {stat.avgScore}%
              </AppText>
            )}
            <Ionicons name="checkmark-circle" size={22} color={todayColor.orange} />
          </View>
        ) : status === 'ready' || status === 'in-progress' ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: todayColor.orange,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
