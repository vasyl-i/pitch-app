/**
 * The Exercises tab: every exercise in one place — ear-training drills and
 * melody/scale practice, grouped by category. Premium exercises are shown
 * locked so free users see what's available.
 *
 * A SectionList, not a ScrollView: the library is ~30 rows of ~20 native
 * views each, and mounting all of them at once stalled the UI thread when
 * the tab opened. Virtualised, only the rows near the screen exist.
 */
import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, View, type SectionListData, type SectionListRenderItem } from 'react-native';
import { AppText, Screen, TabTitleRow } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ExercisesScreenProps } from '@/app/navigation/types';
import { useExerciseLibrary, type LibraryItem, type LibrarySection } from './useExerciseLibrary';
import { useAddToDay } from './useAddToDay';
import { SectionHeader } from './ui/SectionHeader';
import { EarDrillRow } from './ui/EarDrillRow';
import { MelodyRow } from './ui/MelodyRow';
import { DayPickerModal } from './ui/DayPickerModal';
import { AddedToast } from './ui/AddedToast';

const keyOf = (item: LibraryItem) => item.id;

export function ExercisesHubScreen({ navigation }: ExercisesScreenProps<'ExercisesHub'>) {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const { sections, best, isPremium, openPaywall } = useExerciseLibrary(t('profile.picker.earDrills'));
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
  // the whole song is a library choice only: it can't be added to a plan
  const openWholeSong = useCallback((exerciseId: string) => navigation.navigate('MelodyPractice', { exerciseId, whole: true }), [navigation]);
  const addMelody = useCallback((activityId: string) => pick({ activityId, kind: 'melody' }), [pick]);

  const renderItem: SectionListRenderItem<LibraryItem, LibrarySection> = useCallback(
    ({ item }) =>
      item.kind === 'drill' ? (
        <EarDrillRow drill={item.drill} color={item.color} locked={item.locked} onLocked={openPaywall} onStart={startDrill} onAdd={addDrill} />
      ) : (
        <MelodyRow
          exercise={item.exercise}
          color={item.color}
          locked={item.locked}
          best={best[item.exercise.id]}
          premium={isPremium}
          onLocked={openPaywall}
          onPress={openMelody}
          onAdd={addMelody}
          onWholeSong={openWholeSong}
        />
      ),
    [best, isPremium, openPaywall, startDrill, addDrill, openMelody, addMelody, openWholeSong],
  );
  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<LibraryItem, LibrarySection> }) => (
      <SectionHeader label={section.label} tagline={section.tagline} locked={section.allLocked} />
    ),
    [],
  );
  const header = useMemo(
    () => (
      <View style={styles.header}>
        <TabTitleRow>
          <AppText variant="title">{t('nav.exercises')}</AppText>
        </TabTitleRow>
        <AppText variant="body" style={styles.subtitle}>
          {t('exercises.subtitle')}
        </AppText>
      </View>
    ),
    [t],
  );

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <SectionList
        sections={sections}
        keyExtractor={keyOf}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
      />

      <DayPickerModal entry={addToPlan.entry} weeklyPlan={addToPlan.weeklyPlan} onSelect={addToPlan.addToDay} onClose={addToPlan.cancel} />
      {addToPlan.toast && <AddedToast message={addToPlan.toast} onDone={addToPlan.clearToast} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg },
  subtitle: { marginTop: spacing.xs },
});
