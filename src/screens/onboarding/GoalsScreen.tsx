/**
 * The learning-profile questions at the end of first-launch onboarding: goal,
 * experience, daily time and reminder time — enough for the lesson generator
 * to personalize day one. Everything else (genres, coach style…) lives in the
 * preferences screen under Account, and all of it is editable any time.
 */
import { ScrollView, View } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  GOAL_LABELS,
  usePreferencesStore,
  type LearningGoal,
  type LearningPreferences,
} from '@/features/learning';
import { AppText, BackButton, Button, ChipGroup, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const GOAL_OPTIONS = (Object.entries(GOAL_LABELS) as [LearningGoal, string][]).map(([value, label]) => ({ value, label }));

const MINUTES = ([5, 10, 15, 20, 30] as const).map((m) => ({ value: m, label: `${m} min` }));

const REMINDERS: { value: number | null; label: string }[] = [
  { value: 8, label: 'Morning' },
  { value: 14, label: 'Afternoon' },
  { value: 19, label: 'Evening' },
  { value: null, label: 'No reminder' },
];

const EXPERIENCE: { value: LearningPreferences['experience']; label: string }[] = [
  { value: 'complete-beginner', label: 'Complete beginner' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'professional', label: 'Professional' },
];

export function GoalsScreen({ navigation }: OnboardingScreenProps<'Goals'>) {
  const { spacing } = useTheme();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const finish = () => {
    // ensure preferences exist even if every default was kept
    setPreferences({});
    navigation.replace('Main', { screen: 'HomeTab', params: { screen: 'Today' } });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />

        <AppText variant="title" style={{ fontSize: 28, marginTop: spacing.lg }}>
          What are you working toward?
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.sm }}>
          Your daily lessons are built around this. You can change it any time.
        </AppText>

        <ChipGroup
          title="Main goal"
          options={GOAL_OPTIONS}
          selected={[prefs.primaryGoal]}
          onSelect={(v) => setPreferences({ primaryGoal: v })}
        />
        <ChipGroup
          title="Experience"
          options={EXPERIENCE}
          selected={[prefs.experience]}
          onSelect={(v) => setPreferences({ experience: v })}
        />
        <ChipGroup
          title="Time per day"
          options={MINUTES}
          selected={[prefs.dailyMinutes]}
          onSelect={(v) => setPreferences({ dailyMinutes: v })}
        />
        <ChipGroup
          title="Practice reminder"
          options={REMINDERS}
          selected={[prefs.reminderHour]}
          onSelect={(v) => setPreferences({ reminderHour: v })}
        />

        <View style={{ flex: 1 }} />

        <View style={{ marginTop: spacing.xl }}>
          <Button title="Start learning" onPress={finish} />
        </View>
      </ScrollView>
    </Screen>
  );
}
