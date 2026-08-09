import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FloatingTabBar } from './FloatingTabBar';
import { TodayScreen } from '@/screens/home';
import { SingHubScreen, InstrumentalUploadScreen, InstrumentalAnalyzingScreen, InstrumentalSingScreen } from '@/screens/sing';
import { ExercisesHubScreen } from '@/screens/exercises';
import { NotificationsScreen } from '@/screens/notifications';
import { ProgressScreen, WeeklyReviewScreen, PerfectExercisesScreen } from '@/screens/progress';
import { JourneyScreen, JourneyAreaScreen } from '@/screens/journey';
import { ProfileScreen, LearningPreferencesScreen } from '@/screens/profile';
import { PracticeLibraryScreen } from '@/screens/library';
import { EarSessionScreen, PracticeCompleteScreen } from '@/screens/session';
import { PaywallScreen } from '@/screens/paywall';
import { WeakSpotsScreen } from '@/screens/weak-spots';
import { ManageSubscriptionScreen } from '@/screens/subscription';
import { StaffPracticeScreen } from '@/screens/staff-practice';
import { VocalRangeSettingsScreen, RedetectLowScreen, RedetectHighScreen, RedetectResultsScreen } from '@/screens/vocal-range';
import { WelcomeScreen, WhyItMattersScreen, LowestNoteScreen, HighestNoteScreen, ResultsScreen, GoalsScreen } from '@/screens/onboarding';
import { useProfileStore } from '@/entities/profile';
import { useTheme } from '@/shared/theme';
import type {
  ExercisesStackParamList,
  HomeStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  ProfileStackParamList,
  RootStackParamList,
  SingStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SingStack = createNativeStackNavigator<SingStackParamList>();
const ExercisesStack = createNativeStackNavigator<ExercisesStackParamList>();
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

/** Account: your voice, your goal, the library, progress and journey. */
function AccountNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={useStackScreenOptions()}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="LearningPreferences" component={LearningPreferencesScreen} />
      <ProfileStack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
      <ProfileStack.Screen name="PracticeLibrary" component={PracticeLibraryScreen} />
      <ProfileStack.Screen name="VocalRangeSettings" component={VocalRangeSettingsScreen} />
      <ProfileStack.Screen name="RedetectLow" component={RedetectLowScreen} />
      <ProfileStack.Screen name="RedetectHigh" component={RedetectHighScreen} />
      <ProfileStack.Screen name="RedetectResults" component={RedetectResultsScreen} />
      <ProfileStack.Screen name="ProgressOverview" component={ProgressScreen} />
      <ProfileStack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <ProfileStack.Screen name="PerfectExercises" component={PerfectExercisesScreen} />
      <ProfileStack.Screen name="JourneyOverview" component={JourneyScreen} />
      <ProfileStack.Screen name="JourneyArea" component={JourneyAreaScreen} />
    </ProfileStack.Navigator>
  );
}

/** First-launch flow: welcome, why it matters, guided low/high detection, results, goals. */
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={useStackScreenOptions()}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="Why" component={WhyItMattersScreen} />
      <OnboardingStack.Screen name="Lowest" component={LowestNoteScreen} />
      <OnboardingStack.Screen name="Highest" component={HighestNoteScreen} />
      <OnboardingStack.Screen name="Results" component={ResultsScreen} />
      <OnboardingStack.Screen name="Goals" component={GoalsScreen} />
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
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SingTab"
        component={SingNavigator}
        options={{
          title: 'Sing',
          tabBarIcon: ({ color, size }) => <Feather name="music" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ExercisesTab"
        component={ExercisesNavigator}
        options={{
          title: 'Exercises',
          // no ear glyph in Feather — Ionicons carries this one icon
          tabBarIcon: ({ color, size }) => <Ionicons name="ear-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountNavigator}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { palette } = useTheme();

  // profile persistence hydrates from AsyncStorage asynchronously; deciding
  // the initial route before it resolves would send a returning user (whose
  // `hasOnboarded` hasn't loaded yet) into onboarding for a frame
  const [hydrated, setHydrated] = useState(() => useProfileStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    if (useProfileStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useProfileStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const hasOnboarded = useProfileStore((s) => s.hasOnboarded);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  return (
    <RootStack.Navigator
      initialRouteName={hasOnboarded ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
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
    </RootStack.Navigator>
  );
}
