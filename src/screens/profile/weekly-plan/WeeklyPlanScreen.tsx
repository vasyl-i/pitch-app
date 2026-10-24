/**
 * Weekly plan: shows Mon–Sun with the exercises assigned to each day.
 * The initial plan is generated after onboarding; users can add/remove
 * exercises per day. Minimum 5 min per day is enforced on removal.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { WEEKDAY_LABELS, type WeekdayIndex } from '@/features/learning';
import { BackButton, Screen, ScreenHeader } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { useWeeklyPlan } from './useWeeklyPlan';
import { WeekdaySection } from './WeekdaySection';

export function WeeklyPlanScreen({ navigation }: RootScreenProps<'WeeklyPlan'>) {
  const { t } = useTranslation();
  const { weeklyPlan, expanded, toggleDay, removeExercise } = useWeeklyPlan();

  return (
    <Screen noBottomPadding>
      {/* fixed above the scrolling list */}
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenHeader title={t('profile.weeklyPlan')} subtitle={t('profile.weekly.subtitle')} large />
        <View style={styles.days}>
          {WEEKDAY_LABELS.map((label, i) => {
            const day = i as WeekdayIndex;
            return (
              <WeekdaySection
                key={day}
                label={label}
                entries={weeklyPlan[day] ?? []}
                expanded={expanded === day}
                onToggle={() => toggleDay(day)}
                onRemove={(index) => removeExercise(day, index)}
                onAdd={() => navigation.navigate('ExercisePicker', { dayIndex: day })}
              />
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg + spacing.sm, paddingBottom: spacing.xxl },
  days: { marginTop: spacing.xl },
});
