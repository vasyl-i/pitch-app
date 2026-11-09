import './bootstrap';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthGate } from '@/features/auth';
import { ThemeProvider } from '@/shared/theme';
import { toastConfig } from '@/shared/ui';
import { NAVIGATION_THEME } from './bootstrap';
import { useAppStartup, useScreenTracking } from './useAppStartup';
import { RootNavigator, PasswordResetRedirect } from './navigation/RootNavigator';
import { AuthNavigator } from './navigation/AuthNavigator';
import { LanguageSync } from './sync/LanguageSync';
import { NetworkSync } from './sync/NetworkSync';
import { SyncManager } from './sync/SyncManager';
import { ReminderSync } from './sync/ReminderSync';
import { TrialReminderSync } from './sync/TrialReminderSync';
import { WeeklyPlanSync } from './sync/WeeklyPlanSync';
import { UserPropertiesSync } from './sync/UserPropertiesSync';

export default function App() {
  const { fontsLoaded } = useAppStartup();
  const { navigationRef, onStateChange } = useScreenTracking();
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageSync />
          <NetworkSync />
          <NavigationContainer ref={navigationRef} theme={NAVIGATION_THEME} onStateChange={onStateChange}>
            <AuthGate fallback={<AuthNavigator />}>
              {/* background work that needs a signed-in (or guest) user */}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
});
