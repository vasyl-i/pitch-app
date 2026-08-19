/**
 * Persistent subscription state, plus the paywall's transient UI state.
 *
 * The store owns *what the billing system believes* and nothing else. It does
 * not decide what a user may see — that is `resolveEntitlements`, and screens
 * reach it through `useEntitlement`, never through `status` here.
 *
 * Swapping the mock for StoreKit is a one-line change to `adapter` below.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import { MockBillingAdapter, type BillingAdapter, type PurchaseOutcome } from '../lib/billing';
import { isTrialEligible } from '../lib/entitlements';
import { freeSubscription, type PlanId, type SubscriptionState } from './types';

interface SubscriptionStoreState {
  subscription: SubscriptionState;
  /** a purchase/restore is in flight — the paywall disables its buttons */
  pending: boolean;
  /** last failure, for inline display; cleared on the next attempt */
  error: string | null;

  purchase(planId: PlanId): Promise<PurchaseOutcome>;
  restore(): Promise<PurchaseOutcome>;
  /** turn off auto-renew, keeping access until the period ends */
  cancelAutoRenew(): void;
  /** dev/QA affordance — never reachable from a shipping build's UI */
  debugSetSubscription(next: SubscriptionState): void;
  reset(): void;
}

/**
 * The live billing implementation.
 *
 * To ship real billing: implement `BillingAdapter` over StoreKit 2 (or
 * RevenueCat) and assign it here. Everything downstream — paywall, gates,
 * entitlements, persistence — already speaks this interface.
 */
const adapter: BillingAdapter = new MockBillingAdapter({
  trialEligible: () => isTrialEligible(useSubscriptionStore.getState().subscription),
  restorable: () => {
    const { subscription } = useSubscriptionStore.getState();
    // a mock "restore" can only find what this device already knew about
    return subscription.firstSubscribedAt === null ? null : subscription;
  },
});

export const billingAdapter = adapter;

export const useSubscriptionStore = create<SubscriptionStoreState>()(
  persist(
    (set, get) => ({
      subscription: freeSubscription(),
      pending: false,
      error: null,

      async purchase(planId) {
        if (get().pending) return { kind: 'cancelled' } as const;
        set({ pending: true, error: null });
        try {
          const outcome = await adapter.purchase(planId);
          if (outcome.kind === 'purchased' || outcome.kind === 'restored') {
            set({ subscription: outcome.state, pending: false });
          } else {
            set({ pending: false, error: outcome.kind === 'failed' ? outcome.message : null });
          }
          return outcome;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Purchase failed. Please try again.';
          set({ pending: false, error: message });
          return { kind: 'failed', message } as const;
        }
      },

      async restore() {
        if (get().pending) return { kind: 'cancelled' } as const;
        set({ pending: true, error: null });
        try {
          const outcome = await adapter.restore();
          if (outcome.kind === 'restored' || outcome.kind === 'purchased') {
            set({ subscription: outcome.state, pending: false });
          } else {
            set({ pending: false, error: outcome.kind === 'failed' ? outcome.message : null });
          }
          return outcome;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Could not restore purchases.';
          set({ pending: false, error: message });
          return { kind: 'failed', message } as const;
        }
      },

      cancelAutoRenew: () => set({ subscription: { ...get().subscription, willRenew: false } }),

      debugSetSubscription: (next) => set({ subscription: next, error: null, pending: false }),

      reset: () => set({ subscription: freeSubscription(), pending: false, error: null }),
    }),
    {
      name: 'pitch-coach-subscription',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      // transient flags must never come back from disk stuck on
      partialize: (s) => ({ subscription: s.subscription }),
    }
  )
);
