/**
 * Pick an exercise to add to a specific day of the weekly plan.
 * Reuses the same data sources as ExercisesHubScreen, with a search filter.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { WEEKDAY_LABELS, type WeekdayIndex } from '@/features/learning';
import { AppText, Screen, ScreenHeader, SearchField } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { MAX_PER_DAY, useExercisePicker } from './useExercisePicker';
import { PickerRow } from './PickerRow';
import { EarPickerRow } from './EarPickerRow';

export function ExercisePickerScreen({ navigation, route }: RootScreenProps<'ExercisePicker'>) {
  const { t } = useTranslation();
  const day = route.params.dayIndex as WeekdayIndex;
  const { search, setSearch, drills, categories, addedCounts, atLimit, add, count } = useExercisePicker(day);

  return (
    <Screen>
      <ScreenHeader
        title={t('profile.weekly.add')}
        subtitle={t('profile.picker.subtitle', { day: WEEKDAY_LABELS[day], count, max: MAX_PER_DAY })}
        onBack={navigation.goBack}
      />

      <View style={styles.search}>
        <SearchField value={search} onChangeText={setSearch} placeholder={t('profile.picker.search')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {drills.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label" style={styles.sectionTitle}>
              {t('profile.picker.earDrills')}
            </AppText>
            {drills.map(({ drill, color, minutes }) => (
              <EarPickerRow
                key={drill.id}
                drill={drill}
                color={color}
                minutes={minutes}
                added={addedCounts.get(drill.id) ?? 0}
                disabled={atLimit}
                onSelect={(difficultyId) => add({ activityId: drill.id, kind: 'ear', difficultyId })}
              />
            ))}
          </View>
        )}

        {categories.map(({ meta, rows }) => (
          <View key={meta.id} style={styles.section}>
            <AppText variant="label" style={styles.sectionTitle}>
              {meta.label}
            </AppText>
            {rows.map(({ exercise, color, minutes }) => (
              <PickerRow
                key={exercise.id}
                id={exercise.id}
                color={color}
                title={exercise.title}
                minutes={minutes}
                source={exercise.source}
                added={addedCounts.get(exercise.id) ?? 0}
                disabled={atLimit}
                onPress={() => add({ activityId: exercise.id, kind: 'melody' })}
              />
            ))}
          </View>
        ))}

        {drills.length === 0 && categories.length === 0 && (
          <AppText variant="body" center style={styles.noMatch}>
            {t('profile.picker.noMatch', { query: search })}
          </AppText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginVertical: spacing.md },
  list: { paddingBottom: spacing.xxl },
  section: { marginTop: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm },
  noMatch: { marginTop: spacing.xxl },
});
