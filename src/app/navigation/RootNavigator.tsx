import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import { FloatingTabBar } from './FloatingTabBar';
import { TodayScreen } from '@/screens/home';
import { SingHubScreen, InstrumentalUploadScreen, InstrumentalAnalyzingScreen, InstrumentalSingScreen } from '@/screens/sing';
import { ExercisesHubScreen } from '@/screens/exercises';
import { NotificationsScreen } from '@/screens/notifications';
import { ProgressScreen, WeeklyReviewScreen, PerfectExercisesScreen } from '@/screens/progress';
import { JourneyScreen, JourneyAreaScreen } from '@/screens/journey';
import { ProfileScreen, LearningPreferencesScreen, ExerciseSettingsScreen, SoundSettingsScreen, ReminderSettingsScreen } from '@/screens/profile';
import { PracticeLibraryScreen } from '@/screens/library';
import { EarSessionScreen, PracticeCompleteScreen } from '@/screens/session';
import { PaywallScreen } from '@/screens/paywall';
import { WeakSpotsScreen } from '@/screens/weak-spots';
import { ManageSubscriptionScreen } from '@/screens/subscription';
import { StaffPracticeScreen } from '@/screens/staff-practice';
import { VocalRangeSettingsScreen, RedetectLowScreen, RedetectHighScreen, RedetectResultsScreen } from '@/screens/vocal-range';
import { WelcomeScreen, LowestNoteScreen, HighestNoteScreen, ResultsScreen, GoalsScreen, ReminderOnboardingScreen } from '@/screens/onboarding';
import { useProfileStore } from '@/entities/profile';
import { waitForSyncReady } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import type {
  ExercisesStackParamList,
  HomeStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  ProfileStackParamList,
  ProgressStackParamList,
  RootStackParamList,
  SingStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SingStack = createNativeStackNavigator<SingStackParamList>();
const ExercisesStack = createNativeStackNavigator<ExercisesStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function useStackScreenOptions() {
  const { palette } = useTheme();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: palette.background },
  } as const;
}

/** Home: the dashboard — progress, streak, and the two practice doors. */
function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={useStackScreenOptions()}>
      <HomeStack.Screen name="Today" component={TodayScreen} />
    </HomeStack.Navigator>
  );
}

/** Sing: today's guided practice plus singing with an uploaded instrumental. */
function SingNavigator() {
  return (
    <SingStack.Navigator screenOptions={useStackScreenOptions()}>
      <SingStack.Screen name="SingHub" component={SingHubScreen} />
      <SingStack.Screen name="InstrumentalUpload" component={InstrumentalUploadScreen} />
      <SingStack.Screen name="InstrumentalAnalyzing" component={InstrumentalAnalyzingScreen} />
    </SingStack.Navigator>
  );
}

/** Exercises: ear training, launched directly. */
function ExercisesNavigator() {
  return (
    <ExercisesStack.Navigator screenOptions={useStackScreenOptions()}>
      <ExercisesStack.Screen name="ExercisesHub" component={ExercisesHubScreen} />
    </ExercisesStack.Navigator>
  );
}

/** Progress: stats, trends, calendar, journey, and weekly review. */
function ProgressNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={useStackScreenOptions()}>
      <ProgressStack.Screen name="ProgressOverview" component={ProgressScreen} />
      <ProgressStack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <ProgressStack.Screen name="PerfectExercises" component={PerfectExercisesScreen} />
      <ProgressStack.Screen name="JourneyOverview" component={JourneyScreen} />
      <ProgressStack.Screen name="JourneyArea" component={JourneyAreaScreen} />
    </ProgressStack.Navigator>
  );
}

/** Account: your voice, your goal, the library, and settings. */
function AccountNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={useStackScreenOptions()}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="LearningPreferences" component={LearningPreferencesScreen} />
      <ProfileStack.Screen name="ExerciseSettings" component={ExerciseSettingsScreen} />
      <ProfileStack.Screen name="SoundSettings" component={SoundSettingsScreen} />
      <ProfileStack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
      <ProfileStack.Screen name="PracticeLibrary" component={PracticeLibraryScreen} />
      <ProfileStack.Screen name="VocalRangeSettings" component={VocalRangeSettingsScreen} />
      <ProfileStack.Screen name="RedetectLow" component={RedetectLowScreen} />
      <ProfileStack.Screen name="RedetectHigh" component={RedetectHighScreen} />
      <ProfileStack.Screen name="RedetectResults" component={RedetectResultsScreen} />
    </ProfileStack.Navigator>
  );
}

/** First-launch flow: welcome → voice detection → results → goals → reminder. */
function OnboardingNavigator({ initialRoute = 'Welcome' }: { initialRoute?: keyof OnboardingStackParamList }) {
  return (
    <OnboardingStack.Navigator initialRouteName={initialRoute} screenOptions={useStackScreenOptions()}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="Lowest" component={LowestNoteScreen} />
      <OnboardingStack.Screen name="Highest" component={HighestNoteScreen} />
      <OnboardingStack.Screen name="Results" component={ResultsScreen} />
      <OnboardingStack.Screen name="Goals" component={GoalsScreen} />
      <OnboardingStack.Screen name="Reminder" component={ReminderOnboardingScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  const { palette } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarStyle: { position: 'absolute', height: 0, borderTopWidth: 0, elevation: 0 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Image source={require('../../../assets/bottom-bar/home.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
      {/*<Tab.Screen*/}
      {/*  name="SingTab"*/}
      {/*  component={SingNavigator}*/}
      {/*  options={{*/}
      {/*    title: 'Sing',*/}
      {/*    tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" size={size} color={color} />,*/}
      {/*  }}*/}
      {/*/>*/}
      <Tab.Screen
        name="ExercisesTab"
        component={ExercisesNavigator}
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => <Image source={require('../../../assets/bottom-bar/ear.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressNavigator}
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <Image source={require('../../../assets/bottom-bar/Chart.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountNavigator}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Image source={require('../../../assets/bottom-bar/gear.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { palette } = useTheme();

  // profile persistence hydrates from MMKV synchronously, but Zustand's
  // persist middleware can defer — choosing the initial route before it
  // resolves would send a returning user into onboarding for a frame
  const [hydrated, setHydrated] = useState(() => useProfileStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    if (useProfileStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useProfileStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  // After login, the server pull restores the user's profile (including
  // hasOnboarded). Wait for it before choosing the initial route so a
  // returning user doesn't flash through onboarding.
  const [syncDone, setSyncDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    waitForSyncReady().then(() => {
      if (!cancelled) setSyncDone(true);
    });
    return () => { cancelled = true; };
  }, []);

  const onboardingStep = useProfileStore((s) => s.onboardingStep);

  if (!hydrated || !syncDone) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const isOnboarded = onboardingStep === 'complete';
  // Resume at the right step if the user killed the app mid-onboarding
  const onboardingInitialRoute =
    onboardingStep === 'goals-complete' ? 'Reminder'
    : onboardingStep === 'range-complete' ? 'Goals'
    : 'Welcome';

  return (
    <RootStack.Navigator
      initialRouteName={isOnboarded ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <RootStack.Screen name="Onboarding">
        {() => <OnboardingNavigator initialRoute={onboardingInitialRoute} />}
      </RootStack.Screen>
      <RootStack.Screen name="Main" component={MainTabs} />
      {/* full-screen practice: no tab bar, no mid-session wandering */}
      <RootStack.Screen name="EarSession" component={EarSessionScreen} />
      <RootStack.Screen name="MelodyPractice" component={StaffPracticeScreen} options={{ gestureEnabled: false }} />
      <RootStack.Screen name="InstrumentalSing" component={InstrumentalSingScreen} />
      <RootStack.Screen name="PracticeComplete" component={PracticeCompleteScreen} options={{ gestureEnabled: false }} />
      <RootStack.Screen name="WeakSpots" component={WeakSpotsScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      {/* modal: the paywall is always an interruption of something else, and
          must be dismissible without losing the user's place */}
      <RootStack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
    </RootStack.Navigator>
  );
}
