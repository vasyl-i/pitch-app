/**
 * Edit learning preferences any time. Saves live into the preferences store;
 * historical learning data is untouched by design (separate store).
 */
import { ScrollView } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  GENRE_OPTIONS,
  GOAL_LABELS,
  usePreferencesStore,
  type LearningGoal,
  type LearningPreferences,
} from '@/features/learning';
import { AppText, BackButton, ChipGroup, Screen, type ChipOption } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

type Option<T> = ChipOption<T>;

const GOAL_OPTIONS = (Object.entries(GOAL_LABELS) as [LearningGoal, string][]).map(([value, label]) => ({ value, label }));

const MINUTES: Option<LearningPreferences['dailyMinutes']>[] = [5, 10, 15, 20, 30].map((m) => ({
  value: m as LearningPreferences['dailyMinutes'],
  label: `${m} min`,
}));

const EXPERIENCE: Option<LearningPreferences['experience']>[] = [
  { value: 'complete-beginner', label: 'Complete beginner' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'professional', label: 'Professional' },
];

const READING: Option<LearningPreferences['musicReading']>[] = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'advanced', label: 'Advanced' },
];

const COACH: Option<LearningPreferences['coachStyle']>[] = [
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'direct', label: 'Direct' },
  { value: 'technical', label: 'Technical' },
];

const REMINDER: Option<number | null>[] = [
  { value: null, label: 'Off' },
  { value: 8, label: 'Morning' },
  { value: 14, label: 'Afternoon' },
  { value: 19, label: 'Evening' },
];

const DIFFICULTY: Option<LearningPreferences['preferredDifficulty']>[] = [
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'challenge', label: 'Challenge' },
];

export function LearningPreferencesScreen({ navigation }: ProfileScreenProps<'LearningPreferences'>) {
  const { spacing } = useTheme();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const toggleGenre = (genre: string) => {
    const has = prefs.preferredGenres.includes(genre);
    setPreferences({
      preferredGenres: has ? prefs.preferredGenres.filter((g) => g !== genre) : [...prefs.preferredGenres, genre],
    });
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.sm }}>
          Learning preferences
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Changing these reshapes future lessons — your history and skill progress stay intact.
        </AppText>

        <ChipGroup
          title="Primary goal"
          options={GOAL_OPTIONS}
          selected={[prefs.primaryGoal]}
          onSelect={(v) => setPreferences({ primaryGoal: v, secondaryGoal: prefs.secondaryGoal === v ? null : prefs.secondaryGoal })}
        />
        <ChipGroup
          title="Secondary goal (optional)"
          options={GOAL_OPTIONS.filter((o) => o.value !== prefs.primaryGoal)}
          selected={prefs.secondaryGoal ? [prefs.secondaryGoal] : []}
          onSelect={(v) => setPreferences({ secondaryGoal: prefs.secondaryGoal === v ? null : v })}
        />
        <ChipGroup title="Daily practice time" options={MINUTES} selected={[prefs.dailyMinutes]} onSelect={(v) => setPreferences({ dailyMinutes: v })} />
        <ChipGroup title="Experience level" options={EXPERIENCE} selected={[prefs.experience]} onSelect={(v) => setPreferences({ experience: v })} />
        <ChipGroup title="Music reading" options={READING} selected={[prefs.musicReading]} onSelect={(v) => setPreferences({ musicReading: v })} />
        <ChipGroup
          title="Preferred genres"
          options={GENRE_OPTIONS.map((g) => ({ value: g, label: g }))}
          selected={prefs.preferredGenres}
          onSelect={toggleGenre}
        />
        <ChipGroup title="Coach style" options={COACH} selected={[prefs.coachStyle]} onSelect={(v) => setPreferences({ coachStyle: v })} />
        <ChipGroup title="Practice reminder" options={REMINDER} selected={[prefs.reminderHour]} onSelect={(v) => setPreferences({ reminderHour: v })} />
        <ChipGroup title="Difficulty" options={DIFFICULTY} selected={[prefs.preferredDifficulty]} onSelect={(v) => setPreferences({ preferredDifficulty: v })} />
      </ScrollView>
    </Screen>
  );
}
