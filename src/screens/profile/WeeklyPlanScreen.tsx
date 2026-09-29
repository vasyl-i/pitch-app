/**
 * Weekly plan: shows Mon–Sun with the exercises assigned to each day.
 * The initial plan is generated after onboarding; users can add/remove
 * exercises per day. Minimum 5 min per day is enforced on removal.
 */
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  WEEKDAY_LABELS,
  dayTotalMinutes,
  canRemoveExercise,
  resolveEntries,
  generateDefaultWeeklyPlan,
  weeklyPlanFromSteps,
  useLessonSessionStore,
  usePreferencesStore,
  DEFAULT_PREFERENCES,
  type WeekdayIndex,
  type WeeklyPlan,
} from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

export function WeeklyPlanScreen({ navigation }: RootScreenProps<'WeeklyPlan'>) {
  const { palette, spacing } = useTheme();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const { isPremium } = usePremiumStatus();

  // If the user doesn't have a weekly plan yet (existing user who skipped
  // the updated onboarding), generate one from the current daily lesson
  // so it matches what "Today's plan" already shows.
  // Also regenerate if the existing plan is incomplete (most days empty).
  const lessonSteps = useLessonSessionStore((s) => s.steps);
  useEffect(() => {
    const existing = prefs.weeklyPlan;
    const filledDays = existing
      ? ([0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[]).filter((d) => (existing[d]?.length ?? 0) > 0).length
      : 0;
    const needsPlan = !existing || filledDays < 7;
    if (needsPlan) {
      const plan = lessonSteps.length > 0
        ? weeklyPlanFromSteps(lessonSteps)
        : generateDefaultWeeklyPlan(prefs.dailyMinutes, isPremium ? 'premium' : 'free');
      setPreferences({ weeklyPlan: plan });
    }
  }, []);

  const weeklyPlan: WeeklyPlan = prefs.weeklyPlan ?? {};
  const [expanded, setExpanded] = useState<WeekdayIndex | null>(null);

  const toggleDay = (day: WeekdayIndex) => {
    setExpanded((prev) => (prev === day ? null : day));
  };

  const removeExercise = (day: WeekdayIndex, index: number) => {
    const entries = weeklyPlan[day] ?? [];
    if (!canRemoveExercise(entries, index)) {
      Alert.alert('Minimum time', 'Removing this exercise would make the day shorter than 5 minutes.');
      return;
    }
    const updated = entries.filter((_, i) => i !== index);
    const next = { ...weeklyPlan };
    if (updated.length === 0) {
      delete next[day];
    } else {
      next[day] = updated;
    }
    setPreferences({ weeklyPlan: next });
  };

  return (
    <Screen noBottomPadding>
      <View style={{ paddingBottom: 16 }}>
      <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.sm }}>
          Weekly plan
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Your daily exercises for each day of the week.
        </AppText>

        <View style={{ marginTop: spacing.xl }}>
          {(WEEKDAY_LABELS as readonly string[]).map((label, i) => {
            const day = i as WeekdayIndex;
            const entries = weeklyPlan[day] ?? [];
            const isExpanded = expanded === day;
            const resolved = resolveEntries(entries);
            const totalMin = dayTotalMinutes(entries);

            return (
              <View key={day}>
                <Pressable onPress={() => toggleDay(day)} accessibilityRole="button">
                  {({ pressed }) => (
                    <View style={[styles.dayRow, pressed && { opacity: 0.7 }]}>
                      <View style={{ flex: 1 }}>
                        <AppText
                          variant="label"
                          style={{ fontSize: 16 }}
                          color={palette.textPrimary}
                        >
                          {label}
                        </AppText>
                        <AppText variant="caption" style={{ marginTop: 2 }}>
                          {resolved.length > 0
                            ? `${resolved.length} exercise${resolved.length !== 1 ? 's' : ''} · ${totalMin} min`
                            : 'No exercises'}
                        </AppText>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={palette.textFaint}
                      />
                    </View>
                  )}
                </Pressable>

                {isExpanded && (
                  <View style={styles.expandedBlock}>
                    {resolved.length > 0 ? (
                      resolved.map(({ entry, activity }, idx) => (
                        <View key={`${entry.activityId}-${idx}`} style={styles.exerciseRow}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="body" style={{ fontSize: 15 }} color={palette.textPrimary}>
                              {activity.title}
                            </AppText>
                            <AppText variant="caption" style={{ marginTop: 1 }}>
                              {activity.minutes} min
                              {entry.difficultyId ? ` · ${entry.difficultyId}` : ''}
                            </AppText>
                          </View>
                          <Pressable
                            onPress={() => removeExercise(day, idx)}
                            hitSlop={12}
                            accessibilityRole="button"
                            accessibilityLabel="Remove exercise"
                          >
                            <Ionicons name="close-circle" size={22} color={palette.textFaint} />
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <AppText variant="caption" style={{ paddingVertical: spacing.sm }}>
                        No exercises for this day.
                      </AppText>
                    )}

                    <Pressable
                      onPress={() => navigation.navigate('ExercisePicker', { dayIndex: day })}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: 'rgba(200, 218, 89, 0.12)', marginTop: 8 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="add" size={16} color={palette.accent} />
                      <AppText variant="caption" color={palette.accent} style={{ fontSize: 14 }}>
                        Add exercise
                      </AppText>
                    </Pressable>
                  </View>
                )}

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  expandedBlock: {
    paddingBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
