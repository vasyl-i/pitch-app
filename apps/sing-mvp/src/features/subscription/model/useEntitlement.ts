/**
 * The hooks every screen uses to ask about access.
 *
 * This is the *only* sanctioned way for UI to branch on Premium. Screens
 * never read `subscription.status`; they name a capability and get a boolean.
 */
import { useMemo } from 'react';
import {
  effectiveStatus,
  isPremium,
  isTrialEligible,
  resolveEntitlements,
  trialDaysRemaining,
  type Entitlements,
} from '../lib/entitlements';
import { planById } from './plans';
import { useSubscriptionStore } from './subscriptionStore';
import type { Plan, PremiumFeature, SubscriptionStatus } from './types';

/**
 * Whether one capability is unlocked.
 *
 * ```tsx
 * const canSeeFeedback = useEntitlement('ai-session-feedback');
 * ```
 */
export function useEntitlement(feature: PremiumFeature): boolean {
  const subscription = useSubscriptionStore((s) => s.subscription);
  return useMemo(() => resolveEntitlements(subscription)[feature], [subscription, feature]);
}

/** the whole flag set, for screens that branch on several at once */
export function useEntitlements(): Entitlements {
  const subscription = useSubscriptionStore((s) => s.subscription);
  return useMemo(() => resolveEntitlements(subscription), [subscription]);
}

export interface PremiumStatus {
  isPremium: boolean;
  status: SubscriptionStatus;
  plan: Plan | null;
  /** whole days left in a running trial, else null */
  trialDaysLeft: number | null;
  /** may this user still be offered a free trial? */
  trialEligible: boolean;
  willRenew: boolean;
  currentPeriodEnd: number | null;
}

/**
 * The subscription facts the *account* UI needs — the Profile row, the manage
 * screen, the trial countdown. Feature gates should use `useEntitlement`
 * instead; this exists for surfaces that talk about the subscription itself.
 */
export function usePremiumStatus(): PremiumStatus {
  const subscription = useSubscriptionStore((s) => s.subscription);
  return useMemo(() => {
    const now = Date.now();
    return {
      isPremium: isPremium(subscription, now),
      status: effectiveStatus(subscription, now),
      plan: subscription.planId ? planById(subscription.planId) : null,
      trialDaysLeft: trialDaysRemaining(subscription, now),
      trialEligible: isTrialEligible(subscription),
      willRenew: subscription.willRenew,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }, [subscription]);
}
