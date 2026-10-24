import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { palette } from '@/shared/theme';
import { InstrumentalSingScreen } from '@/screens/sing';
import { NotificationsScreen } from '@/screens/notifications';
import {
  LearningPreferencesScreen,
  ExerciseSettingsScreen,
  WeeklyPlanScreen,
  ExercisePickerScreen,
  SoundSettingsScreen,
  LanguageSettingsScreen,
  ReminderSettingsScreen,
} from '@/screens/profile';
import { EarSessionScreen, PracticeCompleteScreen } from '@/screens/session';
import { PaywallScreen } from '@/screens/paywall';
import { WeakSpotsScreen } from '@/screens/weak-spots';
import { ManageSubscriptionScreen } from '@/screens/subscription';
import { StaffPracticeScreen } from '@/screens/staff-practice';
import { NewPasswordScreen, CheckEmailScreen } from '@/screens/auth';
import { VocalRangeSettingsScreen, RedetectLowScreen, RedetectHighScreen, RedetectResultsScreen } from '@/screens/vocal-range';
import type { RootStackParamList } from './types';
import { OnboardingNavigator, STACK_OPTIONS } from './stacks';
import { MainTabs } from './MainTabs';
import { useRootReady } from './useRootReady';

export { PasswordResetRedirect } from './PasswordResetRedirect';

// dev-only screens, may not exist in prod builds
const DevMenuScreen = __DEV__ ? require('@/screens/dev/DevMenuScreen').DevMenuScreen : null;
const DevMicCalibrationScreen = __DEV__ ? require('@/screens/dev/DevMicCalibrationScreen').DevMicCalibrationScreen : null;

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MODAL = { presentation: 'modal' } as const;
const NO_SWIPE_BACK = { gestureEnabled: false } as const;

/** Onboarding or the tabs, plus every full-screen flow pushed over them. */
export function RootNavigator() {
  const { ready, onboarded, onboardingStart } = useRootReady();
  if (!ready) return <View style={styles.loading} />;

  return (
    <RootStack.Navigator initialRouteName={onboarded ? 'Main' : 'Onboarding'} screenOptions={STACK_OPTIONS}>
      <RootStack.Screen name="Onboarding">{() => <OnboardingNavigator initialRoute={onboardingStart} />}</RootStack.Screen>
      <RootStack.Screen name="Main" component={MainTabs} />
      {/* full-screen practice: no tab bar, no mid-session wandering */}
      <RootStack.Screen name="EarSession" component={EarSessionScreen} />
      <RootStack.Screen name="MelodyPractice" component={StaffPracticeScreen} options={NO_SWIPE_BACK} />
      <RootStack.Screen name="InstrumentalSing" component={InstrumentalSingScreen} />
      <RootStack.Screen name="PracticeComplete" component={PracticeCompleteScreen} options={NO_SWIPE_BACK} />
      <RootStack.Screen name="WeakSpots" component={WeakSpotsScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      {/* modal: the paywall always interrupts something else, and must be
          dismissible without losing the user's place */}
      <RootStack.Screen name="Paywall" component={PaywallScreen} options={MODAL} />
      <RootStack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
      <RootStack.Screen name="LearningPreferences" component={LearningPreferencesScreen} />
      <RootStack.Screen name="ExerciseSettings" component={ExerciseSettingsScreen} />
      <RootStack.Screen name="WeeklyPlan" component={WeeklyPlanScreen} />
      <RootStack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
      <RootStack.Screen name="SoundSettings" component={SoundSettingsScreen} />
      <RootStack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <RootStack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
      <RootStack.Screen name="VocalRangeSettings" component={VocalRangeSettingsScreen} />
      <RootStack.Screen name="RedetectLow" component={RedetectLowScreen} />
      <RootStack.Screen name="RedetectHigh" component={RedetectHighScreen} />
      <RootStack.Screen name="RedetectResults" component={RedetectResultsScreen} />
      <RootStack.Screen name="NewPassword" component={NewPasswordScreen} options={MODAL} />
      {__DEV__ && DevMenuScreen && (
        <>
          <RootStack.Screen name="DevMenu" component={DevMenuScreen} options={MODAL} />
          {/* the auth stack's screen, reachable here for previewing only */}
          <RootStack.Screen name="DevCheckEmail" component={CheckEmailScreen as never} />
          <RootStack.Screen name="DevMicCalibration" component={DevMicCalibrationScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: palette.background },
});
