import { useEffect } from 'react';
import {
  generateDefaultWeeklyPlan,
  jsDateToWeekdayIndex,
  planHasPremiumActivity,
  planPredatesFreeCatalogExpansion,
  planRepeatsEveryDay,
  usePreferencesStore,
} from '@/features/learning';
import { useAuthStore, waitForSyncReady } from '@/features/auth';
import { isPremium, useSubscriptionStore } from '@/features/subscription';
import { mmkv } from '@/shared/lib/storage';

/**
 * Rebuilds the auto-generated weekly plan when it no longer fits the user:
 *
 * - Upgraded to Premium: a plan without a single Premium exercise was built
 *   for the free tier, so it's rebuilt from the full catalog and the new
 *   material shows up in daily practice straight away.
 * - Legacy plan: the old default put the same list on every day of the week.
 *   It's replaced by a varied one, keeping today's list so a plan in progress
 *   doesn't change under the user.
 * - Old free plan: built before the interval/chord ear drills and the
 *   scale/arpeggio warm-ups became free, so it holds none of them. Rebuilt
 *   the same way, once per user on this device.
 *
 * All checks wait for the server pull, which can replace the local plan,
 * and run again only when the Premium state or the signed-in user changes,
 * so they never fight the user's own edits to the plan.
 */
/** set once this device has refreshed a user's old free plan for the bigger free catalog */
const freePlanRefreshKey = (userId: string | undefined) => `weekly-plan-free-catalog-v2:${userId ?? 'local'}`;

export function WeeklyPlanSync() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const premium = isPremium(subscription);
  // SyncManager (rendered first) starts the pull once auth has settled
  const authLoading = useAuthStore((s) => s.loading);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    waitForSyncReady().then(() => {
      if (cancelled) return;
      const { preferences: prefs, setPreferences } = usePreferencesStore.getState();
      const plan = prefs?.weeklyPlan;
      if (!plan) return;

      const tier = premium ? 'premium' : 'free';
      if (premium && !planHasPremiumActivity(plan)) {
        setPreferences({ weeklyPlan: generateDefaultWeeklyPlan(prefs.dailyMinutes, tier) });
      } else if (
        planRepeatsEveryDay(plan) ||
        (!premium && !mmkv.getBoolean(freePlanRefreshKey(userId)) && planPredatesFreeCatalogExpansion(plan))
      ) {
        const varied = generateDefaultWeeklyPlan(prefs.dailyMinutes, tier);
        const today = jsDateToWeekdayIndex(new Date());
        setPreferences({ weeklyPlan: { ...varied, [today]: plan[today] } });
      }
      // one shot per device: a plan the user trims back to the old exercises
      // later on is their choice, not a stale plan
      if (!premium) mmkv.set(freePlanRefreshKey(userId), true);
    });
    return () => {
      cancelled = true;
    };
  }, [premium, authLoading, userId]);

  return null;
}
