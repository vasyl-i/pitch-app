/**
 * The daily exercises list for the TodayScreen. Shows today's lesson steps
 * as a vertical list with per-exercise status, a thin progress bar, and a
 * primary CTA to start/continue practice.
 */
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep, LessonSlot } from '@/features/learning';
import { useLessonSessionStore } from '@/features/learning';
import type { TodayExerciseStat } from '@/features/progress';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { ExerciseRow } from './ExerciseRow';
import { PillButton } from './PillButton';

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
}: {
  steps: GuidedStep[];
  completedSlots: LessonSlot[];
  planReady: boolean;
  allDone: boolean;
  doneCount: number;
  onPrimaryAction: () => void;
  onStepPress: (step: GuidedStep) => void;
  todayStats: Map<string, TodayExerciseStat>;
}) {
  const { typography, spacing } = useTheme();
  const activeSlot = useLessonSessionStore((s) => s.activeSlot);
  const partialProgress = useLessonSessionStore((s) => s.partialProgress);
  const nextSlot = steps.find((s) => !completedSlots.includes(s.slot))?.slot ?? null;

  const progress = steps.length > 0 ? doneCount / steps.length : 0;

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 16 }}>
          Today's exercises
        </AppText>
        <AppText color={todayColor.inkSecondary} style={{ fontFamily: typography.family.medium, fontSize: 14 }}>
          {doneCount} of {steps.length}
        </AppText>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 3,
          borderRadius: 1.5,
          backgroundColor: todayColor.surfaceMuted,
          marginTop: spacing.sm,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 3,
            borderRadius: 1.5,
            backgroundColor: todayColor.orange,
            width: `${Math.round(progress * 100)}%`,
          }}
        />
      </View>

      {/* Exercise rows */}
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {!planReady && steps.length === 0 ? (
          <AppText
            color={todayColor.inkSecondary}
            variant="caption"
            style={{ paddingVertical: spacing.lg, textAlign: 'center' }}
          >
            Putting today's session together…
          </AppText>
        ) : (
          steps.map((step, i) => {
            const done = completedSlots.includes(step.slot);
            const status: StepStatus = done
              ? 'completed'
              : step.slot === activeSlot
                ? 'in-progress'
                : step.slot === nextSlot
                  ? 'ready'
                  : 'upcoming';

            return (
              <ExerciseRow
                key={step.slot}
                step={step}
                status={status}
                index={i}
                stat={todayStats.get(step.activityId)}
                partialRounds={partialProgress[step.slot]?.completedRounds}
                onPress={() => onStepPress(step)}
              />
            );
          })
        )}
      </View>

      {/* Dot progress indicator */}
      {steps.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm }}>
          {steps.map((step, i) => {
            const done = completedSlots.includes(step.slot);
            return (
              <View
                key={step.slot}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: done ? todayColor.orange : todayColor.surfaceMuted,
                }}
              />
            );
          })}
        </View>
      )}

      {/* CTA */}
      <View style={{ marginTop: spacing.lg }}>
        {allDone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={todayColor.orange} />
            <AppText
              color={todayColor.inkSecondary}
              style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}
            >
              Practice complete — great work today.
            </AppText>
          </View>
        ) : (
          <PillButton
            title={doneCount > 0 ? 'Continue today\u2019s practice' : 'Start today\u2019s practice'}
            disabled={!planReady || steps.length === 0}
            onPress={onPrimaryAction}
          />
        )}
      </View>
    </View>
  );
}
