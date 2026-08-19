import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startLearningTracker } from '@/features/learning';
import { AuthGate, useAuthStore, startSync, stopSync, pullFromServer } from '@/features/auth';
import { SignInScreen } from '@/screens/auth';
import { ThemeProvider, theme } from '@/shared/theme';
import { preloadPianoSamples } from '@/shared/audio';
import { RootNavigator } from './navigation/RootNavigator';

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

  // every finished practice session flows into the learning profile from here
  useEffect(() => {
    startLearningTracker();
  }, []);

  // decode piano samples in the background so first note plays instantly
  useEffect(() => {
    preloadPianoSamples();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: theme.palette.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
