/**
 * The billing boundary.
 *
 * App Store billing is deliberately NOT integrated yet. Rather than scatter
 * "TODO: StoreKit" through the UI, the entire payment surface is defined here
 * as one narrow interface and backed by a local mock. The paywall, the store,
 * and every gate are already written against the real contract, so shipping
 * billing later means writing one adapter and swapping one line in
 * `subscriptionStore` — no product code changes.
 *
 * The interface is shaped after what StoreKit 2 / Google Play Billing /
 * RevenueCat actually give you (async, cancellable, restore as a first-class
 * operation, entitlement recomputed from a transaction) so the real adapter
 * won't have to bend the contract to fit.
 *
 * Pure logic — no React Native imports.
 */
import { planById } from '../model/plans';
import type { PlanId, SubscriptionState } from '../model/types';

export type PurchaseOutcome =
  | { kind: 'purchased'; state: SubscriptionState }
  | { kind: 'restored'; state: SubscriptionState }
  /** the user backed out of the store sheet — not an error, don't alert */
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string };

export interface BillingAdapter {
  /** an id for diagnostics/analytics — which implementation is live */
  readonly id: string;
  /** whether real money can change hands; false for the mock */
  readonly isLive: boolean;
  /** start a purchase for a plan; resolves once the store sheet closes */
  purchase(planId: PlanId, now?: number): Promise<PurchaseOutcome>;
  /** re-apply any entitlement already owned by this store account */
  restore(now?: number): Promise<PurchaseOutcome>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** calendar-month approximation; the real store supplies exact dates */
const MONTH_MS = 30 * DAY_MS;

/**
 * Build the subscription state a successful purchase produces.
 *
 * Shared by the mock and (later) the real adapter: a store transaction gives
 * you a product id and dates, and this is the one place that turns those into
 * our state shape. `trialEligible` is passed in because only the caller knows
 * the user's history — the store's own trial eligibility check is
 * account-wide.
 */
export function subscriptionFromPurchase(
  planId: PlanId,
  opts: { now: number; trialEligible: boolean; source?: SubscriptionState['source'] }
): SubscriptionState {
  const plan = planById(planId);
  const usesTrial = plan.trialDays > 0 && opts.trialEligible;
  const trialEndsAt = usesTrial ? opts.now + plan.trialDays * DAY_MS : null;
  // paid time starts when the trial ends, so the first bill lands correctly
  const paidStart = trialEndsAt ?? opts.now;

  return {
    status: usesTrial ? 'trialing' : 'active',
    planId,
    currentPeriodEnd: paidStart + plan.periodMonths * MONTH_MS,
    trialEndsAt,
    firstSubscribedAt: opts.now,
    willRenew: true,
    source: opts.source ?? 'store',
  };
}

/**
 * The stand-in until StoreKit lands: grants the entitlement locally after a
 * short delay so the paywall's loading and success states are real and
 * exercised. It never charges anything and never talks to a network.
 *
 * `isLive: false` is load-bearing — the UI reads it to label the flow as a
 * preview, so a mock purchase can never be mistaken for a real one.
 */
interface MockBillingOptions {
  /** ms of fake store latency, so spinners are genuinely visible */
  latencyMs?: number;
  /** supplies the user's trial history at purchase time */
  trialEligible: () => boolean;
  /** what `restore()` should find; defaults to "nothing to restore" */
  restorable?: () => SubscriptionState | null;
}

export class MockBillingAdapter implements BillingAdapter {
  readonly id = 'mock';
  readonly isLive = false;
  private readonly opts: MockBillingOptions;

  constructor(opts: MockBillingOptions) {
    this.opts = opts;
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.opts.latencyMs ?? 700));
  }

  async purchase(planId: PlanId, now: number = Date.now()): Promise<PurchaseOutcome> {
    await this.delay();
    return {
      kind: 'purchased',
      state: subscriptionFromPurchase(planId, {
        now,
        trialEligible: this.opts.trialEligible(),
        source: 'sandbox',
      }),
    };
  }

  async restore(): Promise<PurchaseOutcome> {
    await this.delay();
    const found = this.opts.restorable?.() ?? null;
    return found
      ? { kind: 'restored', state: found }
      : { kind: 'failed', message: 'No previous purchase found for this account.' };
  }
}
