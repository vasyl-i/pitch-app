import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startLearningTracker } from '@/features/learning';
import { AuthGate, useAuthStore, startSync, stopSync, pullFromServer } from '@/features/auth';
import { SignInScreen } from '@/screens/auth';
import { ThemeProvider, theme } from '@/shared/theme';
import { preloadPianoSamples } from '@/shared/audio';
import { RootNavigator } from './navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

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
          <AuthGate fallback={<SignInScreen />}>
            <NavigationContainer theme={navigationTheme}>
              <SyncManager />
              <RootNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </AuthGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
