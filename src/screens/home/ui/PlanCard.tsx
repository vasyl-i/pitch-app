import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep, LessonSlot } from '@/features/learning';
import { useLessonSessionStore } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';
import { PillButton } from './PillButton';
import { PlanStepCard } from './PlanStepCard';
import { HUES, type StepStatus } from './planCardColors';

/** today's plan as a stack of pastel step cards, with the start/continue button under it */
export function PlanCard({ steps, completedSlots, planReady, allDone, doneCount, onPrimaryAction, onStepPress, onViewAll }: {
  steps: GuidedStep[];
  completedSlots: LessonSlot[];
  planReady: boolean;
  allDone: boolean;
  doneCount: number;
  onPrimaryAction: () => void;
  onStepPress: (step: GuidedStep) => void;
  onViewAll: () => void;
}) {
  const { t } = useTranslation();
  const ordered = useOrderedSteps(steps, completedSlots);

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="label" weight="medium" color={todayColor.ink}>
          {t('home.plan.title')}
        </AppText>
        <Pressable onPress={onViewAll} hitSlop={8}>
          <AppText variant="small" weight="medium" color={todayColor.orange}>
            {t('home.plan.morePractice')}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.stack}>
        {ordered.map(({ step, hue, status }, i) => (
          <PlanStepCard key={step.slot} step={step} status={status} hue={hue} index={i} onPress={() => onStepPress(step)} />
        ))}
        {!planReady && (
          <AppText variant="caption" color={todayColor.inkSecondary} style={styles.preparing}>
            {t('home.plan.preparing')}
          </AppText>
        )}
      </View>

      <View style={styles.cta}>
        {allDone ? (
          <View style={styles.complete}>
            <Ionicons name="checkmark-circle" size={20} color={todayColor.orange} />
            <AppText variant="small" color={todayColor.inkSecondary} style={styles.completeText}>
              {t('home.plan.completeExplore')}
            </AppText>
          </View>
        ) : (
          <PillButton
            title={doneCount > 0 ? t('home.plan.continue') : t('home.plan.start')}
            disabled={!planReady || steps.length === 0}
            onPress={onPrimaryAction}
          />
        )}
      </View>
    </View>
  );
}

/**
 * The steps with their status and hue. Completed cards float to the top of
 * the stack, closest to the section title; the rest sink toward the button.
 * Each keeps the hue of its original position so reordering never recolours
 * the deck.
 */
function useOrderedSteps(steps: GuidedStep[], completedSlots: LessonSlot[]) {
  const activeSlot = useLessonSessionStore((s) => s.activeSlot);
  // the next not-yet-done step in original order — same rule `nextGuidedStep`
  // uses, kept in sync here so the "Ready" card always matches the button
  const nextSlot = steps.find((s) => !completedSlots.includes(s.slot))?.slot ?? null;
  return steps
    .map((step, index) => {
      const status: StepStatus = completedSlots.includes(step.slot)
        ? 'completed'
        : step.slot === activeSlot
          ? 'in-progress'
          : step.slot === nextSlot
            ? 'ready'
            : 'upcoming';
      return { step, hue: HUES[index % HUES.length], status };
    })
    .sort((a, b) => Number(b.status === 'completed') - Number(a.status === 'completed'));
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stack: { marginTop: spacing.xl },
  preparing: { paddingVertical: spacing.md },
  cta: { marginTop: spacing.lg },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  completeText: { flex: 1 },
});
