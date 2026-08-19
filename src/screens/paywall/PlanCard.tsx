/**
 * One selectable plan on the paywall.
 *
 * Every string is derived from the plan data (see `model/plans`) — price,
 * per-month equivalent, savings badge, trial line. Nothing here is written by
 * hand, so a price change can't leave a stale "Save 17%" on screen.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatMonthlyEquivalent,
  formatPlanPrice,
  savingsBadge,
  type Plan,
} from '@/features/subscription';
import { useTheme } from '@/shared/theme';
import { AppText, Card } from '@/shared/ui';

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  /** false once the user has used their trial — the offer must disappear */
  showTrial: boolean;
  onSelect: () => void;
}

export function PlanCard({ plan, selected, showTrial, onSelect }: PlanCardProps) {
  const { palette, spacing, radii } = useTheme();
  const savings = savingsBadge(plan);
  const withTrial = showTrial && plan.trialDays > 0;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.name}, ${formatPlanPrice(plan)}${withTrial ? `, ${plan.trialDays} day free trial` : ''}`}
      onPress={onSelect}
      style={styles.wrapper}
    >
      {({ pressed }) => (
        <>
          {plan.recommended && (
            <View style={[styles.ribbon, { backgroundColor: palette.accent, borderRadius: radii.pill }]}>
              <AppText variant="caption" color={palette.onAccent} style={styles.ribbonText}>
                Best value
              </AppText>
            </View>
          )}

          <Card variant={selected ? 'highlighted' : 'default'} style={[{ padding: spacing.lg }, pressed && { opacity: 0.85 }]}>
            <View style={styles.row}>
              <View style={[styles.radio, { borderColor: selected ? palette.accent : palette.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: palette.accent }]} />}
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <AppText variant="label" style={{ fontSize: 17 }}>
                    {plan.name}
                  </AppText>
                  {savings && (
                    <View style={[styles.savings, { backgroundColor: 'rgba(200, 218, 89, 0.16)' }]}>
                      <AppText variant="caption" color={palette.accent} style={{ fontSize: 10, fontWeight: '600' }}>
                        {savings}
                      </AppText>
                    </View>
                  )}
                </View>

                <AppText variant="body" style={{ marginTop: 2 }}>
                  {formatPlanPrice(plan)}
                  {plan.periodMonths > 1 && ` · ${formatMonthlyEquivalent(plan)}`}
                </AppText>

                {withTrial && (
                  <View style={[styles.trialRow, { marginTop: 6 }]}>
                    <Ionicons name="gift-outline" size={13} color={palette.accent} />
                    <AppText variant="caption" color={palette.accent}>
                      {plan.trialDays} days free, then {formatPlanPrice(plan)}
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  ribbon: { position: 'absolute', top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 3 },
  ribbonText: { fontSize: 9, letterSpacing: 0.8, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savings: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
