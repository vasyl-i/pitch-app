import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { SkillCategory } from '@/features/learning';
import type { PaywallSource, PremiumFeature } from '@/features/subscription';
import type { DetectionResult } from '@/features/vocal-range';

/** The Home tab: the dashboard — overall progress, weekly streak, and the two entry points. */
export type HomeStackParamList = {
  Today: undefined;
};

/** The Sing tab: guided daily practice, plus singing along to an uploaded instrumental. */
export type SingStackParamList = {
  SingHub: undefined;
  InstrumentalUpload: undefined;
  InstrumentalAnalyzing: { trackId: string };
};

/** The Exercises tab: ear-training, launched freely outside the guided lesson. */
export type ExercisesStackParamList = {
  ExercisesHub: undefined;
};

/**
 * The Account tab: your voice, your goals, the free-practice library, and
 * (relocated here from their former top-level tabs) the stats dashboard and
 * the skill-tree journey.
 */
export type ProfileStackParamList = {
  ProfileHome: undefined;
  LearningPreferences: undefined;
  SoundSettings: undefined;
  ManageSubscription: undefined;
  PracticeLibrary: undefined;
  VocalRangeSettings: undefined;
  RedetectLow: undefined;
  RedetectHigh: { low: DetectionResult };
  RedetectResults: { low: DetectionResult; high: DetectionResult };
  ProgressOverview: undefined;
  WeeklyReview: undefined;
  PerfectExercises: undefined;
  JourneyOverview: undefined;
  JourneyArea: { category: SkillCategory };
};

/** First-launch onboarding: welcome, why it matters, detection, results, learning goals. */
export type OnboardingStackParamList = {
  Welcome: undefined;
  Why: undefined;
  Lowest: undefined;
  Highest: { low: DetectionResult };
  Results: { low: DetectionResult; high: DetectionResult };
  Goals: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SingTab: NavigatorScreenParams<SingStackParamList>;
  ExercisesTab: NavigatorScreenParams<ExercisesStackParamList>;
  AccountTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Root: onboarding (first launch only), the tabbed app, and the full-screen
 * practice sessions. Sessions live above the tabs so practicing is immersive
 * (no tab bar) and reachable from anywhere — guided from Sing, free from the
 * library or the journey.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  /** an ear/voice drill session; guided steps auto-advance the daily lesson */
  EarSession: { exerciseId: string; difficultyId?: string; guided?: boolean };
  /** a staff-practice melody session */
  MelodyPractice: { exerciseId: string; guided?: boolean };
  /** singing along to an uploaded instrumental against its detected key */
  InstrumentalSing: { trackId: string };
  /** end-of-lesson summary for the guided flow */
  PracticeComplete: undefined;
  /** the Premium drill list generated from the singer's own weak spots */
  WeakSpots: undefined;
  /** empty-state placeholder — no notification source is wired up yet */
  Notifications: undefined;
  /**
   * The paywall, presented modally over whatever prompted it. `source` is the
   * gate that sent the user here — it is the primary conversion dimension, so
   * every entry point is required to say where it came from.
   */
  Paywall: { source: PaywallSource; feature?: PremiumFeature };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type HomeScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, T>,
  TabScreenProps<keyof MainTabParamList>
>;

export type SingScreenProps<T extends keyof SingStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SingStackParamList, T>,
  TabScreenProps<keyof MainTabParamList>
>;

export type ExercisesScreenProps<T extends keyof ExercisesStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ExercisesStackParamList, T>,
  TabScreenProps<keyof MainTabParamList>
>;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, T>,
  TabScreenProps<keyof MainTabParamList>
>;

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<OnboardingStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
