import { useEffect } from 'react';
import { pullFromServer, startSync, stopSync, useAuthStore } from '@/features/auth';
import { registerPushToken } from '@/shared/lib/notifications';
import { fetchSubscriptionState, identifyRevenueCatUser, onSubscriptionChange, useSubscriptionStore } from '@/features/subscription';
import { identifyUser, resetAnalyticsUser } from '@/shared/lib/analytics';
import { onReconnect } from '@/shared/lib/network';

/** Starts cloud sync + pulls latest data when the user is authenticated. */
export function SyncManager() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const guest = useAuthStore((s) => s.guest);

  useEffect(() => {
    // Don't reset analytics while auth is still loading — we don't know the
    // user state yet and calling amplitude.reset() would generate a new
    // anonymous device ID, inflating "new user" counts.
    if (loading) return;

    if (!user) {
      // Only reset if this is a genuine sign-out (not guest mode).
      // Guest users keep Amplitude's default device-based identity so
      // repeated opens don't count as separate new users.
      if (!guest) {
        resetAnalyticsUser();
      }
      return;
    }
    identifyUser(user.id, {
      provider: user.app_metadata?.provider ?? 'unknown',
    });
    pullFromServer();
    startSync();
    // back online: reconcile whatever changed while the connection was down
    const unsubReconnect = onReconnect(() => void pullFromServer());
    registerPushToken(user.id);

    // Identify user with RevenueCat and sync subscription state
    identifyRevenueCatUser(user.id)
      .then(() => fetchSubscriptionState())
      .then((state) => useSubscriptionStore.getState().syncSubscription(state))
      .catch(() => {
        // RevenueCat init failure is non-critical — local state persists
      });

    // Listen for real-time subscription changes (renewals, expirations)
    const unsubRC = onSubscriptionChange((state) => {
      useSubscriptionStore.getState().syncSubscription(state);
    });

    return () => {
      stopSync();
      unsubReconnect();
      unsubRC();
    };
  }, [user, loading, guest]);

  return null;
}
