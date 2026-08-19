/**
 * Entitlements: the single pure function from "what the store says" to "what
 * the app may show". Every gate in the app resolves through here.
 *
 * Two rules keep this layer honest:
 *
 *   1. Nothing else in the app may read `SubscriptionState.status` to decide
 *      whether to show something. Screens ask for a *feature*. That is what
 *      lets a tier, promo, or server-driven override land in one file.
 *   2. The mapping is data (`FEATURE_MATRIX`), not branching. A future
 *      "Plus" tier between free and premium becomes another column, not a
 *      rewrite of every call site.
 *
 * Pure — no React, no storage, no billing SDK. Unit-testable under plain node.
 */
import type { PremiumFeature, SubscriptionState, SubscriptionStatus } from '../model/types';

/**
 * The access tiers the matrix is defined over. `premium` covers trialing,
 * active and grace alike — a trialing user must see the full product, or the
 * trial isn't testing the thing they'd be paying for.
 */
export type AccessTier = 'free' | 'premium';

/** statuses that entitle full access */
const PREMIUM_STATUSES: readonly SubscriptionStatus[] = ['trialing', 'active', 'grace'];

export function tierForStatus(status: SubscriptionStatus): AccessTier {
  return PREMIUM_STATUSES.includes(status) ? 'premium' : 'free';
}

/**
 * Which tier each capability requires.
 *
 * Everything the free tier gets — vocal range detection, melody/scale/arpeggio
 * practice, ear training, headline stats, progress tracking, the daily streak,
 * and a real (if fixed) daily practice plan — is simply *absent* from this
 * matrix. Only gated capabilities are listed, so this file doubles as the
 * definitive answer to "what does paying actually buy?".
 */
export const FEATURE_MATRIX: Record<PremiumFeature, AccessTier> = {
  'adaptive-lessons': 'premium',
  'ai-session-feedback': 'premium',
  'weak-spot-training': 'premium',
  'smart-recommendations': 'premium',
  'attempt-comparison': 'premium',
  'performance-overlay': 'premium',
  'advanced-library': 'premium',
  'skill-mastery-detail': 'premium',
  'unlimited-instrumental-uploads': 'premium',

  'future-weekly-report': 'premium',
  'future-vocal-health-summary': 'premium',
  'future-personalized-goals': 'premium',
  'future-smart-reminders': 'premium',
  'future-vocal-milestones': 'premium',
};

/** the resolved flag set — what screens actually consume */
export type Entitlements = Readonly<Record<PremiumFeature, boolean>>;

const TIER_RANK: Record<AccessTier, number> = { free: 0, premium: 1 };

/**
 * Resolve a subscription into its flag set.
 *
 * `now` is injected rather than read from the clock so the resolution is
 * deterministic and testable — and so a lapsed subscription that the store
 * hasn't told us about yet still expires locally.
 */
export function resolveEntitlements(sub: SubscriptionState, now: number = Date.now()): Entitlements {
  const tier = tierForStatus(effectiveStatus(sub, now));
  const rank = TIER_RANK[tier];
  const out = {} as Record<PremiumFeature, boolean>;
  for (const feature of Object.keys(FEATURE_MATRIX) as PremiumFeature[]) {
    out[feature] = rank >= TIER_RANK[FEATURE_MATRIX[feature]];
  }
  return out;
}

/**
 * The status accounting for elapsed time.
 *
 * The store is the authority on renewals, but it can be slow, offline, or
 * simply not consulted since the app launched. Locally expiring a period that
 * has demonstrably passed keeps the app from handing out free Premium to
 * anyone who stays in airplane mode.
 */
export function effectiveStatus(sub: SubscriptionState, now: number = Date.now()): SubscriptionStatus {
  if (sub.status === 'free' || sub.status === 'expired') return sub.status;
  // grace is the store actively retrying payment; only it can end that
  if (sub.status === 'grace') return 'grace';
  if (sub.status === 'trialing' && sub.trialEndsAt !== null && now >= sub.trialEndsAt) {
    // trial elapsed: it converts to paid unless the user turned renewal off
    return sub.willRenew ? 'active' : 'expired';
  }
  if (sub.currentPeriodEnd !== null && now >= sub.currentPeriodEnd && !sub.willRenew) {
    return 'expired';
  }
  return sub.status;
}

export function isPremium(sub: SubscriptionState, now: number = Date.now()): boolean {
  return tierForStatus(effectiveStatus(sub, now)) === 'premium';
}

/**
 * Whether this user may still be offered a free trial. Store rules give one
 * trial per account per subscription group, so anyone who has ever subscribed
 * sees the plain price — promising a trial we can't deliver is a rejection.
 */
export function isTrialEligible(sub: SubscriptionState): boolean {
  return sub.firstSubscribedAt === null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** whole days left in the trial, rounded up; null when not trialing */
export function trialDaysRemaining(sub: SubscriptionState, now: number = Date.now()): number | null {
  if (sub.status !== 'trialing' || sub.trialEndsAt === null) return null;
  return Math.max(0, Math.ceil((sub.trialEndsAt - now) / DAY_MS));
}
