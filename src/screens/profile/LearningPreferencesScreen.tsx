/**
 * Edit learning preferences any time. Saves live into the preferences store;
 * historical learning data is untouched by design (separate store).
 */
import { ScrollView, StyleSheet } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  GENRE_LABELS,
  GENRE_OPTIONS,
  GOAL_LABELS,
  usePreferencesStore,
  type LearningGoal,
  type LearningPreferences,
} from '@/features/learning';
import { BackButton, ChipGroup, Screen, ScreenHeader, type ChipOption } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { formatHour, t, useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';

type Option<T> = ChipOption<T>;

// built per render so labels follow the current language
function buildOptions() {
  const goals = (Object.keys(GOAL_LABELS) as LearningGoal[]).map((value) => ({ value, label: GOAL_LABELS[value] }));
  const minutes: Option<LearningPreferences['dailyMinutes']>[] = [5, 10, 15, 20, 30].map((m) => ({
    value: m as LearningPreferences['dailyMinutes'],
    label: t('common.minutesShort', { count: m }),
  }));
  const experience: Option<LearningPreferences['experience']>[] = [
    { value: 'complete-beginner', label: t('profile.prefs.experience.completeBeginner') },
    { value: 'beginner', label: t('profile.prefs.experience.beginner') },
    { value: 'intermediate', label: t('profile.prefs.experience.intermediate') },
    { value: 'advanced', label: t('profile.prefs.experience.advanced') },
    { value: 'professional', label: t('profile.prefs.experience.professional') },
  ];
  const reading: Option<LearningPreferences['musicReading']>[] = [
    { value: 'none', label: t('profile.prefs.reading.none') },
    { value: 'basic', label: t('profile.prefs.reading.basic') },
    { value: 'comfortable', label: t('profile.prefs.reading.comfortable') },
    { value: 'advanced', label: t('profile.prefs.reading.advanced') },
  ];
  const coach: Option<LearningPreferences['coachStyle']>[] = [
    { value: 'encouraging', label: t('profile.prefs.coach.encouraging') },
    { value: 'direct', label: t('profile.prefs.coach.direct') },
    { value: 'technical', label: t('profile.prefs.coach.technical') },
  ];
  const reminder: Option<number | null>[] = [
    { value: null, label: t('profile.prefs.reminder.off') },
    { value: 8, label: t('profile.prefs.reminder.morning', { time: formatHour(8) }) },
    { value: 14, label: t('profile.prefs.reminder.afternoon', { time: formatHour(14) }) },
    { value: 19, label: t('profile.prefs.reminder.evening', { time: formatHour(19) }) },
  ];
  const difficulty: Option<LearningPreferences['preferredDifficulty']>[] = [
    { value: 'adaptive', label: t('profile.prefs.difficulty.adaptive') },
    { value: 'easy', label: t('profile.prefs.difficulty.easy') },
    { value: 'normal', label: t('profile.prefs.difficulty.normal') },
    { value: 'challenge', label: t('profile.prefs.difficulty.challenge') },
  ];
  const genres = GENRE_OPTIONS.map((g) => ({ value: g, label: GENRE_LABELS[g] ?? g }));
  return { goals, minutes, experience, reading, coach, reminder, difficulty, genres };
}

export function LearningPreferencesScreen({ navigation }: RootScreenProps<'LearningPreferences'>) {
  const { t } = useTranslation();
  const options = buildOptions();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const toggleGenre = (genre: string) => {
    const has = prefs.preferredGenres.includes(genre);
    setPreferences({
      preferredGenres: has ? prefs.preferredGenres.filter((g) => g !== genre) : [...prefs.preferredGenres, genre],
    });
  };

  return (
    <Screen noBottomPadding>
      {/* fixed above the scrolling list */}
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenHeader title={t('profile.prefs.title')} subtitle={t('profile.prefs.subtitle')} large />

        <ChipGroup
          title={t('profile.prefs.primaryGoal')}
          options={options.goals}
          selected={[prefs.primaryGoal]}
          onSelect={(v) => setPreferences({ primaryGoal: v, secondaryGoal: prefs.secondaryGoal === v ? null : prefs.secondaryGoal })}
        />
        <ChipGroup
          title={t('profile.prefs.secondaryGoal')}
          options={options.goals.filter((o) => o.value !== prefs.primaryGoal)}
          selected={prefs.secondaryGoal ? [prefs.secondaryGoal] : []}
          onSelect={(v) => setPreferences({ secondaryGoal: prefs.secondaryGoal === v ? null : v })}
        />
        <ChipGroup title={t('profile.prefs.dailyTime')} options={options.minutes} selected={[prefs.dailyMinutes]} onSelect={(v) => setPreferences({ dailyMinutes: v })} />
        <ChipGroup title={t('profile.prefs.experienceTitle')} options={options.experience} selected={[prefs.experience]} onSelect={(v) => setPreferences({ experience: v })} />
        <ChipGroup title={t('profile.prefs.readingTitle')} options={options.reading} selected={[prefs.musicReading]} onSelect={(v) => setPreferences({ musicReading: v })} />
        <ChipGroup
          title={t('profile.prefs.genres')}
          options={options.genres}
          selected={prefs.preferredGenres}
          onSelect={toggleGenre}
        />
        <ChipGroup title={t('profile.prefs.coachTitle')} options={options.coach} selected={[prefs.coachStyle]} onSelect={(v) => setPreferences({ coachStyle: v })} />
        <ChipGroup title={t('profile.reminder')} options={options.reminder} selected={[prefs.reminderHour]} onSelect={(v) => setPreferences({ reminderHour: v })} />
        <ChipGroup title={t('profile.prefs.difficultyTitle')} options={options.difficulty} selected={[prefs.preferredDifficulty]} onSelect={(v) => setPreferences({ preferredDifficulty: v })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg + spacing.sm, paddingBottom: spacing.xxl },
});
