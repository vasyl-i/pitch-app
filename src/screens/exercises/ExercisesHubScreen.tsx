/**
 * The Exercises tab: every exercise in one place — ear-training drills and
 * melody/scale practice, grouped by category. Premium exercises are shown
 * locked so free users see what's available.
 */
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ExercisesScreenProps } from '@/app/navigation/types';
import { useExerciseLibrary } from './useExerciseLibrary';
import { useAddToDay } from './useAddToDay';
import { SectionHeader } from './ui/SectionHeader';
import { EarDrillRow } from './ui/EarDrillRow';
import { MelodyRow } from './ui/MelodyRow';
import { DayPickerModal } from './ui/DayPickerModal';
import { AddedToast } from './ui/AddedToast';

export function ExercisesHubScreen({ navigation }: ExercisesScreenProps<'ExercisesHub'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const { drills, categories, best, isPremium, openPaywall } = useExerciseLibrary();
  const addToPlan = useAddToDay();
  const { pick } = addToPlan;

  // stable handlers taking the row's id, so the memoised rows don't all
  // re-render when the day picker or the toast opens
  const startDrill = useCallback(
    (exerciseId: string, difficultyId: string | undefined) => navigation.navigate('EarSession', { exerciseId, difficultyId }),
    [navigation],
  );
  const addDrill = useCallback((activityId: string, difficultyId: string | undefined) => pick({ activityId, kind: 'ear', difficultyId }), [pick]);
  const openMelody = useCallback((exerciseId: string) => navigation.navigate('MelodyPractice', { exerciseId }), [navigation]);
  const addMelody = useCallback((activityId: string) => pick({ activityId, kind: 'melody' }), [pick]);

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={styles.header}>
          <AppText variant="title">{t('nav.exercises')}</AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t('exercises.subtitle')}
          </AppText>
        </View>

        <SectionHeader label={t('profile.picker.earDrills')} locked={false} />
        {drills.map(({ drill, color, locked }) => (
          <EarDrillRow
            key={drill.id}
            drill={drill}
            color={color}
            locked={locked}
            onLocked={openPaywall}
            onStart={startDrill}
            onAdd={addDrill}
          />
        ))}

        {categories.map(({ meta, allLocked, rows }) => (
          <View key={meta.id}>
            <SectionHeader label={meta.label} tagline={meta.tagline} locked={allLocked} />
            {rows.map(({ exercise, color, locked }) => (
              <MelodyRow
                key={exercise.id}
                exercise={exercise}
                color={color}
                locked={locked}
                best={best[exercise.id]}
                premium={isPremium}
                onLocked={openPaywall}
                onPress={openMelody}
                onAdd={addMelody}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <DayPickerModal entry={addToPlan.entry} weeklyPlan={addToPlan.weeklyPlan} onSelect={addToPlan.addToDay} onClose={addToPlan.cancel} />
      {addToPlan.toast && <AddedToast message={addToPlan.toast} onDone={addToPlan.clearToast} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg },
  subtitle: { marginTop: spacing.xs },
});
