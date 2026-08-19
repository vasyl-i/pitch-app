/**
 * The plan line-up and its presentation math.
 *
 * Prices live here as integer cents and every display string is *derived* —
 * the "Save 17%" badge, the per-month equivalent, the trial copy. Hardcoding
 * those strings is how a price change ships a paywall that lies about its own
 * discount, so nothing here is written twice.
 *
 * Pure: no React Native imports, so the savings math is unit-testable under
 * plain `node --test`.
 */
import type { Plan, PlanId } from './types';

export const MONTHLY_PLAN: Plan = {
  id: 'monthly',
  productId: 'com.pitchcoach.premium.monthly',
  name: 'Monthly',
  priceCents: 499,
  currency: 'USD',
  periodMonths: 1,
  trialDays: 0,
  recommended: false,
};

export const YEARLY_PLAN: Plan = {
  id: 'yearly',
  productId: 'com.pitchcoach.premium.yearly',
  name: 'Yearly',
  priceCents: 4999,
  currency: 'USD',
  periodMonths: 12,
  trialDays: 7,
  recommended: true,
};

export const PLANS: readonly Plan[] = [MONTHLY_PLAN, YEARLY_PLAN];

export function planById(id: PlanId): Plan {
  return id === 'monthly' ? MONTHLY_PLAN : YEARLY_PLAN;
}

/** the plan the paywall opens on */
export const DEFAULT_PLAN_ID: PlanId = YEARLY_PLAN.id;

/* ------------------------------------------------------------------ *
 * Presentation math                                                   *
 * ------------------------------------------------------------------ */

/** `499` → `"$4.99"`; whole-dollar amounts still show cents, as stores do */
export function formatPrice(cents: number, currency: Plan['currency'] = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : '';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

/** "$4.99/month" · "$49.99/year" */
export function formatPlanPrice(plan: Plan): string {
  return `${formatPrice(plan.priceCents, plan.currency)}/${plan.periodMonths === 12 ? 'year' : 'month'}`;
}

/** what the plan works out to per month — the only fair way to compare them */
export function monthlyEquivalentCents(plan: Plan): number {
  return Math.round(plan.priceCents / plan.periodMonths);
}

/** "$4.17/mo" — the yearly plan's real monthly cost */
export function formatMonthlyEquivalent(plan: Plan): string {
  return `${formatPrice(monthlyEquivalentCents(plan), plan.currency)}/mo`;
}

/**
 * How much cheaper `plan` is than paying `reference` every month, as whole
 * percent. Floored rather than rounded: claiming a bigger discount than the
 * arithmetic supports is exactly the kind of thing store review rejects.
 */
export function savingsPercent(plan: Plan, reference: Plan = MONTHLY_PLAN): number {
  const full = reference.priceCents * plan.periodMonths;
  if (full <= 0 || plan.priceCents >= full) return 0;
  return Math.floor(((full - plan.priceCents) / full) * 100);
}

/** "Save 17%", or null when the plan has no advantage worth a badge */
export function savingsBadge(plan: Plan, reference: Plan = MONTHLY_PLAN): string | null {
  const pct = savingsPercent(plan, reference);
  return pct > 0 ? `Save ${pct}%` : null;
}

/**
 * The trial line, e.g. "Try Premium free for 7 days". Returns null for plans
 * without a trial so callers can't accidentally render an empty promise.
 */
export function trialHeadline(plan: Plan): string | null {
  return plan.trialDays > 0 ? `Try Premium free for ${plan.trialDays} days` : null;
}

/**
 * The legally-required "what happens next" line. Stores reject trials that
 * don't spell out the auto-conversion, so this is generated, never optional.
 */
export function planTerms(plan: Plan): string {
  return plan.trialDays > 0
    ? `${plan.trialDays} days free, then ${formatPlanPrice(plan)}. Renews automatically until cancelled — cancel any time.`
    : `${formatPlanPrice(plan)}. Renews automatically until cancelled — cancel any time.`;
}
