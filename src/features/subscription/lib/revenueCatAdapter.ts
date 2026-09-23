/**
 * RevenueCat billing adapter.
 *
 * Maps RevenueCat's CustomerInfo into the app's SubscriptionState so every
 * gate, paywall, and entitlement check works unchanged. The adapter is the
 * only file that imports the RevenueCat SDK — the rest of the subscription
 * layer stays pure.
 */
import Purchases, {
  type CustomerInfo,
  type PurchasesStoreProduct,
  LOG_LEVEL,
} from 'react-native-purchases';
import type { BillingAdapter, PurchaseOutcome } from './billing';
import type { PlanId, SubscriptionState, SubscriptionStatus } from '../model/types';

const ENTITLEMENT_ID = 'premium';

/**
 * Map a RevenueCat product identifier to our PlanId.
 * Falls back to 'yearly' for unknown products — safer than crashing.
 */
function productToPlanId(productId: string): PlanId {
  if (productId.includes('monthly_799')) return 'monthly';
  return 'yearly';
}

/** Derive our SubscriptionState from RevenueCat's CustomerInfo. */
function customerInfoToState(info: CustomerInfo): SubscriptionState {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];

  if (!entitlement) {
    // Check if there was ever a purchase (for trial eligibility)
    const allEntitlements = info.entitlements.all[ENTITLEMENT_ID];
    return {
      status: 'free',
      planId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      firstSubscribedAt: allEntitlements?.originalPurchaseDate
        ? new Date(allEntitlements.originalPurchaseDate).getTime()
        : null,
      willRenew: false,
      source: 'none',
    };
  }

  const planId = productToPlanId(entitlement.productIdentifier);
  const isSandbox = entitlement.isSandbox;

  let status: SubscriptionStatus = 'active';
  if (entitlement.periodType === 'TRIAL') {
    status = 'trialing';
  } else if (entitlement.billingIssueDetectedAt) {
    status = 'grace';
  }

  const expirationDate = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).getTime()
    : null;

  return {
    status,
    planId,
    currentPeriodEnd: expirationDate,
    trialEndsAt: status === 'trialing' ? expirationDate : null,
    firstSubscribedAt: entitlement.originalPurchaseDate
      ? new Date(entitlement.originalPurchaseDate).getTime()
      : Date.now(),
    willRenew: entitlement.willRenew,
    source: isSandbox ? 'sandbox' : 'store',
  };
}

export class RevenueCatAdapter implements BillingAdapter {
  readonly id = 'revenuecat';
  readonly isLive = true;

  async purchase(planId: PlanId): Promise<PurchaseOutcome> {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      if (!currentOffering) {
        return { kind: 'failed', message: 'No offerings available. Please try again later.' };
      }

      // Find the package matching the requested plan
      const pkg = currentOffering.availablePackages.find(
        (p) => productToPlanId(p.product.identifier) === planId,
      );

      if (!pkg) {
        return { kind: 'failed', message: `Plan "${planId}" is not available.` };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const state = customerInfoToState(customerInfo);

      if (state.status === 'free') {
        return { kind: 'failed', message: 'Purchase could not be verified. Please try again.' };
      }

      return { kind: 'purchased', state };
    } catch (e: unknown) {
      if (isUserCancelled(e)) return { kind: 'cancelled' };
      const message = e instanceof Error ? e.message : 'Purchase failed. Please try again.';
      return { kind: 'failed', message };
    }
  }

  async restore(): Promise<PurchaseOutcome> {
    try {
      const info = await Purchases.restorePurchases();
      const state = customerInfoToState(info);

      if (state.status === 'free' && state.firstSubscribedAt === null) {
        return { kind: 'failed', message: 'No previous purchase found for this account.' };
      }

      if (state.status === 'free') {
        return { kind: 'failed', message: 'Your subscription has expired.' };
      }

      return { kind: 'restored', state };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not restore purchases.';
      return { kind: 'failed', message };
    }
  }
}

/** Check if the error is a user cancellation (not a real error). */
function isUserCancelled(e: unknown): boolean {
  if (e && typeof e === 'object' && 'userCancelled' in e) {
    return (e as { userCancelled: boolean }).userCancelled === true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Initialization                                                      *
 * ------------------------------------------------------------------ */

let initialized = false;

/**
 * Initialize RevenueCat. Call once at app startup.
 * Must be called before any purchase/restore operations.
 */
export async function initRevenueCat(apiKey: string): Promise<void> {
  if (initialized) return;
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey });
  initialized = true;
}

/**
 * Identify the user with RevenueCat after sign-in.
 * Links their purchases to their Supabase user ID.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!initialized) return;
  await Purchases.logIn(userId);
}

/**
 * Reset RevenueCat to anonymous user on sign-out.
 */
export async function logOutRevenueCat(): Promise<void> {
  if (!initialized) return;
  const isAnonymous = await Purchases.isAnonymous();
  if (!isAnonymous) {
    await Purchases.logOut();
  }
}

/**
 * Fetch the latest customer info and convert to our state shape.
 * Use to sync subscription state on app start or after sign-in.
 */
export async function fetchSubscriptionState(): Promise<SubscriptionState> {
  const info = await Purchases.getCustomerInfo();
  return customerInfoToState(info);
}

/**
 * Listen for real-time subscription changes (renewals, expirations, etc.).
 * Returns an unsubscribe function.
 */
export function onSubscriptionChange(
  callback: (state: SubscriptionState) => void,
): () => void {
  const listener = (info: CustomerInfo) => {
    callback(customerInfoToState(info));
  };
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
