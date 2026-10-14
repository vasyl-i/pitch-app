import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  generateDefaultWeeklyPlan,
  jsDateToWeekdayIndex,
  planHasPremiumActivity,
  planRepeatsEveryDay,
  planPredatesFreeCatalogExpansion,
  startLearningTracker,
  useLessonSessionStore,
  usePreferencesStore,
} from '@/features/learning';
import { AuthGate, useAuthStore, startSync, stopSync, pullFromServer, waitForSyncReady } from '@/features/auth';
import {
  setupNotificationHandler,
  syncReminder,
  setDailyTasksDoneDay,
  registerPushToken,
  scheduleTrialEndingReminder,
  cancelTrialEndingReminder,
} from '@/shared/lib/notifications';
import {
  initRevenueCat,
  identifyRevenueCatUser,
  logOutRevenueCat,
  fetchSubscriptionState,
  isPremium,
  onSubscriptionChange,
  useSubscriptionStore,
} from '@/features/subscription';
import { initAnalytics, identifyUser, resetAnalyticsUser, setUserProperties, track } from '@/shared/lib/analytics';
import { ThemeProvider, theme } from '@/shared/theme';
import { mmkv } from '@/shared/lib/storage';
import { toastConfig } from '@/shared/ui';
import { supabase } from '@/shared/lib/supabase';
import { preloadSamples, useSoundStore } from '@/shared/audio';
import { RootNavigator, PasswordResetRedirect } from './navigation/RootNavigator';
import { AuthNavigator } from './navigation/AuthNavigator';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();
initRevenueCat(
  Platform.OS === 'android'
    ? 'goog_zZKmLeLnBdTHvIfJYGpsHEIHrUo'
    : 'appl_kFBGeARTxhvdqgULiBoIIAvmvUF',
);
initAnalytics();

/**
 * Handle Supabase auth deep links (email confirmation, magic links).
 * Supabase appends tokens as a URL fragment: #access_token=…&refresh_token=…
 */
function handleAuthDeepLink(url: string) {
  // The fragment comes after '#' — parse it for tokens
  const fragment = url.split('#')[1];
  if (!fragment) return;

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (accessToken && refreshToken) {
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (type === 'recovery') {
      useAuthStore.setState({ pendingPasswordReset: true });
    }
  }
}

const satoshiFonts = {
  'Satoshi-Regular': require('../../assets/fonts/Satoshi-Regular.ttf'),
  'Satoshi-Medium': require('../../assets/fonts/Satoshi-Medium.ttf'),
  'Satoshi-Bold': require('../../assets/fonts/Satoshi-Bold.ttf'),
  'Satoshi-Black': require('../../assets/fonts/Satoshi-Black.ttf'),
};

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.palette.background,
    card: theme.palette.background,
    text: theme.palette.textPrimary,
    primary: theme.palette.accent,
  },
};

/** Starts cloud sync + pulls latest data when the user is authenticated. */
function SyncManager() {
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
      unsubRC();
    };
  }, [user, loading, guest]);

  return null;
}

/** Keeps the scheduled local notifications in sync with the reminder preference and today's progress. */
function ReminderSync() {
  const reminderHour = usePreferencesStore((s) => s.preferences?.reminderHour ?? null);
  const reminderMinute = usePreferencesStore((s) => s.preferences?.reminderMinute ?? 0);

  // The day whose guided plan is fully done; the scheduler drops that day's catch-up nudge
  const dailyTasksDoneDay = useLessonSessionStore((s) =>
    s.steps.length > 0 && s.steps.every((step) => s.completedSlots.includes(step.slot)) ? s.planDate : null,
  );

  useEffect(() => {
    syncReminder(reminderHour, reminderMinute);
  }, [reminderHour, reminderMinute]);

  useEffect(() => {
    setDailyTasksDoneDay(dailyTasksDoneDay);
  }, [dailyTasksDoneDay]);

  return null;
}

/** Schedules or cancels the trial-ending push notification based on subscription state. */
function TrialReminderSync() {
  const subscription = useSubscriptionStore((s) => s.subscription);

  useEffect(() => {
    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      scheduleTrialEndingReminder(subscription.trialEndsAt);
    } else {
      cancelTrialEndingReminder();
    }
  }, [subscription.status, subscription.trialEndsAt]);

  return null;
}

/** Keeps Amplitude user properties in sync with subscription and profile state. */
function UserPropertiesSync() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const premium = isPremium(subscription);

  useEffect(() => {
    setUserProperties({
      subscription_status: subscription.status,
      is_premium: premium,
      platform: Platform.OS,
    });
  }, [subscription.status, premium]);

  return null;
}

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

function WeeklyPlanSync() {
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

function getActiveRouteName(state: any): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

export default function App() {
  const [fontsLoaded] = useFonts(satoshiFonts);
  const authLoading = useAuthStore((s) => s.loading);
  const [appleReady, setAppleReady] = useState(Platform.OS !== 'ios');
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const currentRouteRef = useRef<string | undefined>();

  const onNavigationStateChange = useCallback(() => {
    const currentRoute = getActiveRouteName(navigationRef.current?.getRootState());
    if (currentRoute && currentRoute !== currentRouteRef.current) {
      currentRouteRef.current = currentRoute;
      track('screen_viewed', { screen: currentRoute });
    }
  }, []);

  // Handle auth deep links (email confirmation callback)
  useEffect(() => {
    // Handle link that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });
    // Handle links while the app is already open
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
    return () => sub.remove();
  }, []);

  // every finished practice session flows into the learning profile from here
  useEffect(() => {
    startLearningTracker();
  }, []);

  // decode samples for the selected instrument so first note plays instantly
  const soundType = useSoundStore((s) => s.soundType);
  useEffect(() => {
    preloadSamples(soundType);
  }, [soundType]);

  // resolve Apple sign-in availability once so SignInScreen renders complete
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(() => setAppleReady(true));
    }
    setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 2000);
  }, []);

  const appReady = fontsLoaded && !authLoading && appleReady;

  // Hide the native splash screen once everything is initialised — fonts
  // loaded, auth state settled, Apple availability resolved. The screen
  // beneath (SignInScreen or RootNavigator) is fully laid out before it
  // becomes visible, so there are no layout jumps.
  const onLayoutReady = useCallback(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutReady}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer ref={navigationRef} theme={navigationTheme} onStateChange={onNavigationStateChange}>
            <AuthGate fallback={<AuthNavigator />}>
              <SyncManager />
              <ReminderSync />
              <TrialReminderSync />
              <WeeklyPlanSync />
              <UserPropertiesSync />
              <PasswordResetRedirect />
              <RootNavigator />
            </AuthGate>
            <StatusBar style="light" />
          </NavigationContainer>
          <Toast config={toastConfig} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
