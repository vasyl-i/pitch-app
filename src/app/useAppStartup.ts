import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useFonts } from 'expo-font';
import { startLearningTracker } from '@/features/learning';
import { useAuthStore } from '@/features/auth';
import { preloadSamples, useSoundStore } from '@/shared/audio';
import { supabase } from '@/shared/lib/supabase';
import { track } from '@/shared/lib/analytics';
import { APP_FONTS } from './bootstrap';

/**
 * Supabase auth deep links (email confirmation, password recovery) carry the
 * session in the URL fragment: #access_token=…&refresh_token=…&type=…
 */
function handleAuthDeepLink(url: string) {
  const fragment = url.split('#')[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;
  supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (params.get('type') === 'recovery') useAuthStore.setState({ pendingPasswordReset: true });
}

/**
 * Everything the root needs before and while it runs: fonts loaded, auth
 * settled and Apple sign-in availability resolved before the splash hides
 * (so the first screen is fully laid out), auth deep links (cold start and
 * while open), the learning tracker, and the selected instrument's samples
 * decoded so the first note plays instantly.
 */
export function useAppStartup() {
  const [fontsLoaded] = useFonts(APP_FONTS);
  const authLoading = useAuthStore((s) => s.loading);
  const [appleReady, setAppleReady] = useState(Platform.OS !== 'ios');
  const soundType = useSoundStore((s) => s.soundType);

  useEffect(() => {
    Linking.getInitialURL().then((url) => url && handleAuthDeepLink(url));
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    startLearningTracker();
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(() => setAppleReady(true));
    // never leave the splash up, whatever stalls
    setTimeout(() => void SplashScreen.hideAsync(), 2000);
  }, []);

  useEffect(() => {
    preloadSamples(soundType);
  }, [soundType]);

  const ready = fontsLoaded && !authLoading && appleReady;
  const onRootLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return { fontsLoaded, onRootLayout };
}

function activeRouteName(state: any): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  return route.state ? activeRouteName(route.state) : route.name;
}

/** reports each newly focused screen to analytics */
export function useScreenTracking() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const current = useRef<string | undefined>(undefined);
  const onStateChange = useCallback(() => {
    const name = activeRouteName(navigationRef.current?.getRootState());
    if (name && name !== current.current) {
      current.current = name;
      track('screen_viewed', { screen: name });
    }
  }, []);
  return { navigationRef, onStateChange };
}
