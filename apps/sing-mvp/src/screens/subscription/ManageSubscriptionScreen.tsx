/**
 * Premium account status: what you're on, what happens next, and how to leave.
 *
 * Cancellation is deliberately easy to find and states plainly that access
 * continues to the end of the paid period. Burying it converts nobody and
 * costs trust; and on a real build the store's own subscription management is
 * the only place a cancellation can actually happen.
 */
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PREMIUM_BENEFITS,
  billingAdapter,
  formatPrice,
  planTerms,
  usePremiumStatus,
  useSubscriptionStore,
} from '@/features/subscription';
import { AppText, BackButton, Button, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// free-trial-bg.png is 1218×420 — the "Free trial active" card's height
// varies with its content, so unlike a fixed-height card the image can't be
// pre-sized; it's measured at layout time and anchored to the card's right
// edge (cropping the left, mostly-flat side of the source) so the swirl
// accent on the right is always visible instead of being center-cropped out.
const TRIAL_BG_ASPECT = 1218 / 420;

export function ManageSubscriptionScreen({ navigation }: ProfileScreenProps<'ManageSubscription'>) {
  const { palette, spacing, typography } = useTheme();
  const status = usePremiumStatus();
  const cancelAutoRenew = useSubscriptionStore((s) => s.cancelAutoRenew);
  const [trialCardHeight, setTrialCardHeight] = useState(0);

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40, marginTop: spacing.sm }}>
          Premium
        </AppText>

        {!status.isPremium ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Card style={{ padding: spacing.lg }}>
              <AppText variant="label" style={{ fontSize: 16 }}>
                You’re on the free plan
              </AppText>
              <AppText variant="body" style={{ marginTop: 4 }}>
                Vocal range detection, daily practice, ear training and progress tracking are yours to keep.
              </AppText>
            </Card>
            <Button
              title="See Premium"
              onPress={() => navigation.navigate('Paywall', { source: 'profile' })}
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Card
              variant="highlighted"
              style={{ padding: spacing.lg, overflow: 'hidden' }}
              onLayout={(e) => setTrialCardHeight(e.nativeEvent.layout.height)}
            >
              {trialCardHeight > 0 && (
                <Image
                  source={require('../../../assets/free-trial-bg.png')}
                  resizeMode="cover"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    height: trialCardHeight,
                    width: trialCardHeight * TRIAL_BG_ASPECT,
                  }}
                />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <AppText color={palette.onAccent} style={{ fontFamily: typography.family.bold, fontSize: 20 }}>
                  {status.status === 'trialing' ? 'Free trial' : 'Premium'}
                </AppText>

                <View
                  style={{
                    backgroundColor: '#000000',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 2,
                  }}
                >
                  <AppText color="#FFFFFF" style={{ fontSize: typography.size.xs, fontWeight: '700' }}>
                    Active
                  </AppText>
                </View>
              </View>

              {status.trialDaysLeft !== null && (
                <AppText variant="caption" color={palette.onAccent} style={{ marginTop: 2, fontWeight: '600' }}>
                  {status.trialDaysLeft} day{status.trialDaysLeft === 1 ? '' : 's'} of trial remaining
                </AppText>
              )}

              {status.plan && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: spacing.md }}>
                  <AppText color={palette.onAccent} style={{ fontSize: 34, lineHeight: 40, fontWeight: '700' }}>
                    {formatPrice(status.plan.priceCents, status.plan.currency)}
                  </AppText>
                  <AppText color={palette.onAccent} style={{ fontSize: 15 }}>
                    /{status.plan.periodMonths === 12 ? 'year' : 'month'}
                  </AppText>
                </View>
              )}

              {status.currentPeriodEnd !== null && (
                <AppText variant="caption" color={palette.onAccent} style={{ marginTop: 6 }}>
                  {status.willRenew
                    ? `Renews on ${formatDate(status.currentPeriodEnd)}`
                    : `Access ends on ${formatDate(status.currentPeriodEnd)} — you keep Premium until then.`}
                </AppText>
              )}

              {status.status === 'grace' && (
                <AppText variant="caption" color={palette.onAccent} style={{ marginTop: 6 }}>
                  We couldn’t process your last payment. Premium stays on while the store retries.
                </AppText>
              )}

              <View style={{ height: 1, backgroundColor: 'rgba(0, 0, 0, 0.15)', marginTop: spacing.lg, marginBottom: spacing.md }} />

              <AppText color={palette.onAccent} style={{ fontFamily: typography.family.bold, fontSize: typography.size.md }}>
                What's unlocked
              </AppText>
              <View style={{ marginTop: spacing.md, gap: 8 }}>
                {PREMIUM_BENEFITS.map((b) => (
                  <View key={b.feature} style={styles.row}>
                    <Ionicons name="checkmark" size={14} color={palette.onAccent} />
                    <AppText variant="caption" color={palette.onAccent} style={{ flex: 1 }}>
                      {b.title}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>

            {status.plan && (
              <AppText variant="caption" style={{ paddingHorizontal: spacing.xs }}>
                {planTerms({ ...status.plan, trialDays: 0 })}
              </AppText>
            )}

            {status.willRenew && (
              <Button
                title="Turn off auto-renew"
                variant="ghost"
                onPress={cancelAutoRenew}
              />
            )}

            {!billingAdapter.isLive && (
              <AppText variant="caption" color={palette.warning} style={{ textAlign: 'center' }}>
                Preview build — this subscription is local and nothing was charged. On a real build, cancellation happens
                in your App Store account settings.
              </AppText>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
