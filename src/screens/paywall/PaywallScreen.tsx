/**
 * The paywall.
 *
 * Structure follows the order the decision actually gets made: what this is
 * (headline), why it's different from practising harder (subtitle), what you
 * get (benefits), what it costs (plans), then the commitment. The CTA label
 * and the terms line are both derived from the selected plan, so the button
 * always promises exactly what the plan delivers — "Start 7-day free trial"
 * appears if and only if a trial will actually be granted.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_PLAN_ID,
  PAYWALL_HEADLINE,
  PAYWALL_SUBTITLE,
  PLANS,
  PREMIUM_BENEFITS,
  billingAdapter,
  planById,
  planTerms,
  trackMonetization,
  useSubscriptionStore,
  usePremiumStatus,
  type PlanId,
} from '@/features/subscription';
import { AppText, Button, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';
import { PlanCard } from './PlanCard';

export function PaywallScreen({ navigation, route }: RootScreenProps<'Paywall'>) {
  const { palette, spacing, radii } = useTheme();
  const source = route.params?.source ?? 'unknown';

  const { trialEligible, isPremium } = usePremiumStatus();
  const pending = useSubscriptionStore((s) => s.pending);
  const error = useSubscriptionStore((s) => s.error);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);

  const [selectedId, setSelectedId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const selected = planById(selectedId);
  const withTrial = trialEligible && selected.trialDays > 0;

  useEffect(() => {
    trackMonetization({ type: 'paywall_viewed', source, trialEligible });
  }, [source, trialEligible]);

  // an active subscriber has no business on the paywall — this can happen via
  // a stale deep link or a restore completing while the screen is open
  useEffect(() => {
    if (isPremium) navigation.goBack();
  }, [isPremium, navigation]);

  const dismiss = () => {
    trackMonetization({ type: 'paywall_dismissed', source });
    navigation.goBack();
  };

  const selectPlan = (id: PlanId) => {
    setSelectedId(id);
    trackMonetization({ type: 'paywall_plan_selected', source, planId: id });
  };

  const onPurchase = async () => {
    trackMonetization({ type: 'purchase_started', source, planId: selectedId, withTrial });
    const outcome = await purchase(selectedId);
    if (outcome.kind === 'purchased' || outcome.kind === 'restored') {
      trackMonetization({ type: 'purchase_completed', source, planId: selectedId, withTrial });
      navigation.goBack();
    } else if (outcome.kind === 'cancelled') {
      trackMonetization({ type: 'purchase_cancelled', source, planId: selectedId });
    } else {
      trackMonetization({ type: 'purchase_failed', source, planId: selectedId, message: outcome.message });
    }
  };

  const onRestore = async () => {
    trackMonetization({ type: 'restore_started' });
    const outcome = await restore();
    if (outcome.kind === 'restored' || outcome.kind === 'purchased') {
      trackMonetization({ type: 'restore_completed', planId: outcome.state.planId });
      navigation.goBack();
    } else if (outcome.kind === 'failed') {
      trackMonetization({ type: 'restore_failed', message: outcome.message });
    }
  };

  const ctaTitle = pending
    ? 'Please wait…'
    : withTrial
      ? `Start ${selected.trialDays}-day free trial`
      : `Subscribe · ${selected.name}`;

  return (
    <Screen>
      <View style={styles.closeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={dismiss}
          hitSlop={12}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Ionicons name="close" size={24} color={palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <Card variant="highlighted" style={[styles.crest, { borderRadius: radii.pill }]}>
          <Ionicons name="sparkles" size={12} color={palette.accent} />
          <AppText variant="caption" color={palette.accent} style={{ letterSpacing: 0.2 }}>
            Your personal AI vocal coach
          </AppText>
        </Card>

        <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.lg, lineHeight: 40 }}>
          {PAYWALL_HEADLINE}
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.sm }}>
          {PAYWALL_SUBTITLE}
        </AppText>

        <Card style={[styles.benefits, { marginTop: spacing.xl, padding: spacing.lg }]}>
          {PREMIUM_BENEFITS.map((benefit) => (
            <View key={benefit.feature} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.accent} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ fontSize: 15 }}>
                  {benefit.title}
                </AppText>
                <AppText variant="caption" style={{ marginTop: 2 }}>
                  {benefit.detail}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedId}
              showTrial={trialEligible}
              onSelect={() => selectPlan(plan.id)}
            />
          ))}
        </View>

        {error && (
          <AppText variant="caption" color={palette.danger} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {error}
          </AppText>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Button title={ctaTitle} disabled={pending} onPress={onPurchase} />
        </View>

        <AppText variant="caption" style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {planTerms(withTrial ? selected : { ...selected, trialDays: 0 })}
        </AppText>

        <Pressable
          accessibilityRole="button"
          onPress={onRestore}
          disabled={pending}
          style={({ pressed }) => [{ marginTop: spacing.md }, pressed && { opacity: 0.6 }]}
        >
          <AppText variant="caption" color={palette.textSecondary} style={{ textAlign: 'center' }}>
            Restore purchases
          </AppText>
        </Pressable>

        {/* Billing is not wired to the store yet. Saying so plainly beats a
            paywall that looks real and silently grants Premium to everyone. */}
        {!billingAdapter.isLive && (
          <Card
            style={[
              styles.notice,
              { borderColor: palette.warning, borderRadius: radii.md, marginTop: spacing.lg, padding: spacing.md },
            ]}
          >
            <Ionicons name="construct-outline" size={14} color={palette.warning} />
            <AppText variant="caption" color={palette.warning} style={{ flex: 1 }}>
              Preview build — App Store billing isn’t connected. Subscribing here unlocks Premium locally and charges
              nothing.
            </AppText>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  crest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  benefits: { gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
