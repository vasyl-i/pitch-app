/**
 * The subscription platform: plans, billing boundary, entitlements, gating
 * primitives and monetization analytics.
 *
 * The contract with the rest of the app is deliberately narrow — screens
 * import `PremiumGate` / `useEntitlement` and name a capability. Nothing
 * outside this slice should branch on subscription *status*.
 */
export type {
  Plan,
  PlanId,
  PremiumFeature,
  SubscriptionSource,
  SubscriptionState,
  SubscriptionStatus,
} from './model/types';
export { freeSubscription } from './model/types';

export {
  PLANS,
  MONTHLY_PLAN,
  YEARLY_PLAN,
  DEFAULT_PLAN_ID,
  planById,
  formatPrice,
  formatPlanPrice,
  formatMonthlyEquivalent,
  monthlyEquivalentCents,
  savingsPercent,
  savingsBadge,
  trialHeadline,
  planTerms,
} from './model/plans';

export {
  FEATURE_MATRIX,
  effectiveStatus,
  isPremium,
  isTrialEligible,
  resolveEntitlements,
  tierForStatus,
  trialDaysRemaining,
} from './lib/entitlements';
export type { AccessTier, Entitlements } from './lib/entitlements';

export { MockBillingAdapter, subscriptionFromPurchase } from './lib/billing';
export type { BillingAdapter, PurchaseOutcome } from './lib/billing';

export { setMonetizationSink, trackMonetization } from './lib/analytics';
export type { MonetizationEvent, MonetizationSink, PaywallSource } from './lib/analytics';

export { useSubscriptionStore, billingAdapter } from './model/subscriptionStore';
export { useEntitlement, useEntitlements, usePremiumStatus } from './model/useEntitlement';
export type { PremiumStatus } from './model/useEntitlement';
export { usePaywall } from './model/usePaywall';

export { PREMIUM_BENEFITS, PAYWALL_HEADLINE, PAYWALL_SUBTITLE } from './model/benefits';
export type { PremiumBenefit } from './model/benefits';

export { PremiumBadge } from './ui/PremiumBadge';
export { PremiumGate } from './ui/PremiumGate';
export { LockedFeatureCard } from './ui/LockedFeatureCard';
