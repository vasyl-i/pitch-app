import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startLearningTracker } from '@/features/learning';
import { AuthGate, useAuthStore, startSync, stopSync, pullFromServer } from '@/features/auth';
import { ThemeProvider, theme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import { preloadPianoSamples } from '@/shared/audio';
import { RootNavigator } from './navigation/RootNavigator';
import { AuthNavigator } from './navigation/AuthNavigator';

SplashScreen.preventAutoHideAsync();

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

  if (accessToken && refreshToken) {
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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

  useEffect(() => {
    if (!user) return;
    pullFromServer();
    startSync();
    return () => stopSync();
  }, [user]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts(satoshiFonts);
  const authLoading = useAuthStore((s) => s.loading);
  const [appleReady, setAppleReady] = useState(Platform.OS !== 'ios');

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

  // decode piano samples in the background so first note plays instantly
  useEffect(() => {
    preloadPianoSamples();
  }, []);

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
          <NavigationContainer theme={navigationTheme}>
            <AuthGate fallback={<AuthNavigator />}>
              <SyncManager />
              <RootNavigator />
            </AuthGate>
            <StatusBar style="light" />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
