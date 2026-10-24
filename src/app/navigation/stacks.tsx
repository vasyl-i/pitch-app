import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { palette } from '@/shared/theme';
import { TodayScreen } from '@/screens/home';
import { SingHubScreen, InstrumentalUploadScreen, InstrumentalAnalyzingScreen } from '@/screens/sing';
import { ExercisesHubScreen } from '@/screens/exercises';
import { ProgressScreen, WeeklyReviewScreen, PerfectExercisesScreen } from '@/screens/progress';
import { JourneyScreen, JourneyAreaScreen } from '@/screens/journey';
import { ProfileScreen } from '@/screens/profile';
import {
  WelcomeScreen,
  LowestNoteScreen,
  HighestNoteScreen,
  ResultsScreen,
  GoalsScreen,
  PracticeRhythmScreen,
  ReminderOnboardingScreen,
} from '@/screens/onboarding';
import { VocalRangeStartScreen } from '@/screens/onboarding/VocalRangeStartScreen';
import type {
  ExercisesStackParamList,
  HomeStackParamList,
  OnboardingStackParamList,
  ProfileStackParamList,
  ProgressStackParamList,
  SingStackParamList,
} from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SingStack = createNativeStackNavigator<SingStackParamList>();
const ExercisesStack = createNativeStackNavigator<ExercisesStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

/** every stack: no native header, the app background behind each screen */
export const STACK_OPTIONS = { headerShown: false, contentStyle: { backgroundColor: palette.background } } as const;

/** Home: the dashboard — progress, streak, and today's plan. */
export function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={STACK_OPTIONS}>
      <HomeStack.Screen name="Today" component={TodayScreen} />
    </HomeStack.Navigator>
  );
}

/** Sing: today's guided practice plus singing with an uploaded instrumental (tab currently hidden). */
export function SingNavigator() {
  return (
    <SingStack.Navigator screenOptions={STACK_OPTIONS}>
      <SingStack.Screen name="SingHub" component={SingHubScreen} />
      <SingStack.Screen name="InstrumentalUpload" component={InstrumentalUploadScreen} />
      <SingStack.Screen name="InstrumentalAnalyzing" component={InstrumentalAnalyzingScreen} />
    </SingStack.Navigator>
  );
}

/** Exercises: the practice library, launched directly. */
export function ExercisesNavigator() {
  return (
    <ExercisesStack.Navigator screenOptions={STACK_OPTIONS}>
      <ExercisesStack.Screen name="ExercisesHub" component={ExercisesHubScreen} />
    </ExercisesStack.Navigator>
  );
}

/** Progress: stats, trends, calendar, journey, and weekly review. */
export function ProgressNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={STACK_OPTIONS}>
      <ProgressStack.Screen name="ProgressOverview" component={ProgressScreen} />
      <ProgressStack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <ProgressStack.Screen name="PerfectExercises" component={PerfectExercisesScreen} />
      <ProgressStack.Screen name="JourneyOverview" component={JourneyScreen} />
      <ProgressStack.Screen name="JourneyArea" component={JourneyAreaScreen} />
    </ProgressStack.Navigator>
  );
}

/** Account: just the top-level list; sub-screens live in the root stack. */
export function AccountNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={STACK_OPTIONS}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

/** First-launch flow: welcome → goals → voice detection → results → rhythm → reminder. */
export function OnboardingNavigator({ initialRoute = 'Welcome' }: { initialRoute?: keyof OnboardingStackParamList }) {
  return (
    <OnboardingStack.Navigator initialRouteName={initialRoute} screenOptions={STACK_OPTIONS}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="RangeStart" component={VocalRangeStartScreen} />
      <OnboardingStack.Screen name="Lowest" component={LowestNoteScreen} />
      <OnboardingStack.Screen name="Highest" component={HighestNoteScreen} />
      <OnboardingStack.Screen name="Results" component={ResultsScreen} />
      <OnboardingStack.Screen name="Goals" component={GoalsScreen} />
      <OnboardingStack.Screen name="PracticeRhythm" component={PracticeRhythmScreen} />
      <OnboardingStack.Screen name="Reminder" component={ReminderOnboardingScreen} />
    </OnboardingStack.Navigator>
  );
}
