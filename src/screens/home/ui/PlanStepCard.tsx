import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep } from '@/features/learning';
import { SLOT_LABELS, guidedStepTitle } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { t } from '@/shared/i18n';
import { stepCardColors, type StepStatus } from './planCardColors';

const CARD_RADIUS_BUMP = 8; // radii.lg (24) + this puts cards in the 28–36px range the redesign calls for
const CARD_OVERLAP = 36; // ~25% of a typical card's rendered height, so sheets read as a physical stack

const STATUS_LABEL: Partial<Record<StepStatus, () => string>> = {
  completed: () => t('home.status.completed'),
  'in-progress': () => t('home.status.inProgress'),
  ready: () => t('home.status.ready'),
};

/** one pastel sheet of the plan stack, overlapping the one above it */
export function PlanStepCard({ step, status, hue, index, onPress }: {
  step: GuidedStep;
  status: StepStatus;
  hue: string;
  index: number;
  onPress: () => void;
}) {
  const done = status === 'completed';
  const colors = stepCardColors(hue, status);
  const label = STATUS_LABEL[status]?.();

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 70).springify().damping(18).mass(0.9)}
      layout={LinearTransition.springify().damping(18).mass(0.9)}
      style={index > 0 && styles.overlapping}
    >
      <Pressable
        onPress={onPress}
        disabled={done}
        style={({ pressed }) => [styles.card, { backgroundColor: colors.background }, pressed && !done && styles.pressed]}
      >
        <View style={styles.titleRow}>
          <AppText variant="title" color={colors.title} style={styles.title}>
            {guidedStepTitle(step)}
          </AppText>
          {label && (
            <Animated.View key={status} entering={FadeInUp.duration(220)} style={[styles.pill, { backgroundColor: colors.pill }]}>
              {done && <Ionicons name="checkmark" size={13} color={colors.pillText} />}
              <AppText variant="caption" weight="medium" color={colors.pillText}>
                {label}
              </AppText>
            </Animated.View>
          )}
        </View>

        <AppText variant="label" color={colors.secondary}>
          {SLOT_LABELS[step.slot] ?? t('home.practice')}
        </AppText>

        <View style={styles.metaRow}>
          <AppText variant="label" color={colors.meta}>
            {t('common.minutesShort', { count: step.estMinutes })}
          </AppText>
          {!done && <Ionicons name="chevron-forward" size={16} color={colors.chevron} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlapping: { marginTop: -CARD_OVERLAP },
  card: {
    borderRadius: radii.lg + CARD_RADIUS_BUMP,
    padding: spacing.xl,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  pressed: { opacity: 0.9 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { flex: 1, marginRight: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
});
