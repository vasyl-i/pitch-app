/**
 * The subscription domain model.
 *
 * Deliberately split into three independent concepts, because they change for
 * different reasons and at different rates:
 *
 *   1. `PremiumFeature` — the capability vocabulary the *app* speaks. Screens
 *      ask "may I show this?" in these terms and nothing else.
 *   2. `SubscriptionState` — what the *billing system* believes about this
 *      user right now. Written only by the billing adapter.
 *   3. `Entitlements` — the pure mapping between the two (see
 *      `../lib/entitlements`).
 *
 * Keeping (1) separate from (2) is what makes the paywall re-priceable and the
 * plan line-up changeable without touching a single screen: a new tier, a
 * lifetime plan, a promo, or a server-driven entitlement all land in (2)/(3)
 * while every `<PremiumGate feature="...">` in the app stays exactly as is.
 *
 * Plain serializable data only — no React, no React Native, no billing SDK.
 */

/* ------------------------------------------------------------------ *
 * Feature vocabulary                                                  *
 * ------------------------------------------------------------------ */

/**
 * Every capability the app can gate. Adding a future AI feature means adding
 * one member here plus one line in `FEATURE_MATRIX` — no screen, store, or
 * billing code changes.
 *
 * The `future-*` block is intentionally declared before the features ship:
 * the flags exist, resolve correctly, and can be referenced by the paywall
 * copy today, so shipping the feature later is purely additive.
 */
export type PremiumFeature =
  /** the daily lesson is rebuilt from this user's own skill profile */
  | 'adaptive-lessons'
  /** per-session written analysis: what went well, what struggled, and why */
  | 'ai-session-feedback'
  /** the generated "Practice Your Weak Spots" section */
  | 'weak-spot-training'
  /** ranked, explained exercise recommendations */
  | 'smart-recommendations'
  /** assisted vs. independent attempt comparison */
  | 'attempt-comparison'
  /** target / assisted / independent pitch overlay */
  | 'performance-overlay'
  /** the premium half of the exercise catalog */
  | 'advanced-library'
  /** deep per-skill mastery breakdown (free gets headline stats only) */
  | 'skill-mastery-detail'
  /** more than the free tier's 3 imported instrumental tracks */
  | 'unlimited-instrumental-uploads'
  // ---- declared now, implemented later -------------------------------
  | 'future-weekly-report'
  | 'future-vocal-health-summary'
  | 'future-personalized-goals'
  | 'future-smart-reminders'
  | 'future-vocal-milestones';

/* ------------------------------------------------------------------ *
 * Plans                                                               *
 * ------------------------------------------------------------------ */

export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  /** store-facing product identifier — the only string StoreKit needs */
  productId: string;
  name: string;
  /** minor units (cents) so no float arithmetic touches money */
  priceCents: number;
  currency: 'USD';
  /** billing period length in months */
  periodMonths: number;
  /** free-trial length; 0 means no trial */
  trialDays: number;
  /** the plan the paywall pre-selects and visually promotes */
  recommended: boolean;
}

/* ------------------------------------------------------------------ *
 * Subscription state                                                  *
 * ------------------------------------------------------------------ */

/**
 * `trialing` and `active` both entitle Premium; they are distinct because the
 * UI must say different things ("6 days of trial left" vs. "renews Mar 3").
 * `grace` covers a failed renewal the store is still retrying — access stays
 * on, because revoking Premium over a temporarily expired card is a good way
 * to lose a paying customer.
 */
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'grace' | 'expired';

/** how the current entitlement was obtained — drives what the UI may offer */
export type SubscriptionSource = 'none' | 'store' | 'promo' | 'sandbox';

export interface SubscriptionState {
  status: SubscriptionStatus;
  planId: PlanId | null;
  /** epoch ms the current paid period ends, null when never subscribed */
  currentPeriodEnd: number | null;
  /** epoch ms the free trial converts to paid, null when not trialing */
  trialEndsAt: number | null;
  /** epoch ms of the first-ever purchase — gates trial re-eligibility */
  firstSubscribedAt: number | null;
  /** set when the user turns off auto-renew but still has paid time left */
  willRenew: boolean;
  source: SubscriptionSource;
}

export function freeSubscription(): SubscriptionState {
  return {
    status: 'free',
    planId: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    firstSubscribedAt: null,
    willRenew: false,
    source: 'none',
  };
}
