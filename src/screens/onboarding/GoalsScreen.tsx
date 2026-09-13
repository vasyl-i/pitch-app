/**
 * The learning-profile questions at the end of first-launch onboarding: goal,
 * experience, daily time and reminder time — enough for the lesson generator
 * to personalize day one. Everything else (genres, coach style…) lives in the
 * preferences screen under Account, and all of it is editable any time.
 */
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_PREFERENCES,
  GOAL_LABELS,
  usePreferencesStore,
  type LearningGoal,
  type LearningPreferences,
} from '@/features/learning';
import { useProfileStore, rangeSemitones, voiceType } from '@/entities/profile';
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

/** Build a short recommendation based on the singer's detected range. */
function buildRecommendation(profile: ReturnType<typeof useProfileStore.getState>['profile']): {
  goal: LearningGoal;
  text: string;
} | null {
  if (!profile) return null;
  const span = rangeSemitones(profile.maximumRange);
  const type = voiceType(profile.maximumRange);

  // Narrow range (less than an octave) → suggest expanding it
  if (span < 12) {
    return {
      goal: 'expand-range',
      text: `Your detected range is about ${span} semitones (${type}). Expanding it will open up more songs for you.`,
    };
  }
  // Decent range but new singer → pitch accuracy is the foundation
  if (span < 18) {
    return {
      goal: 'sing-in-tune',
      text: `Nice ${type} range! Building pitch accuracy first will make the most of it.`,
    };
  }
  // Wide range → vocal control to use it well
  return {
    goal: 'vocal-control',
    text: `Great ${type} range — ${span} semitones! Vocal control will help you use it to its full potential.`,
  };
}

export function GoalsScreen({ navigation }: OnboardingScreenProps<'Goals'>) {
  const { palette, spacing, radii } = useTheme();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const profile = useProfileStore((s) => s.profile);
  const recommendation = useMemo(() => buildRecommendation(profile), [profile]);

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

        {recommendation && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.sm,
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: 'rgba(200, 218, 89, 0.10)',
            }}
          >
            <Ionicons name="sparkles" size={18} color={palette.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.accent}>
                Based on your voice
              </AppText>
              <AppText variant="body" style={{ fontSize: 14, marginTop: 2 }}>
                {recommendation.text}
              </AppText>
            </View>
          </View>
        )}

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
