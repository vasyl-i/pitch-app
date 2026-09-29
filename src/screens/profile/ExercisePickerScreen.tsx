/**
 * Pick an exercise to add to a specific day of the weekly plan.
 * Reuses the same data sources as ExercisesHubScreen, with a search filter.
 */
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriesInOrder, exercises, type Exercise } from '@/entities/exercise';
import { EXERCISES } from '@/features/ear-training';
import type { ExerciseDefinition } from '@/features/ear-training';
import {
  CATALOG,
  WEEKDAY_LABELS,
  usePreferencesStore,
  DEFAULT_PREFERENCES,
  type WeekdayIndex,
  type WeeklyExerciseEntry,
  type WeeklyPlan,
} from '@/features/learning';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { EXERCISE_CAT_ICONS, DEFAULT_CAT_ICON } from '../home/ui/exerciseIcons';
import type { RootScreenProps } from '@/app/navigation/types';

const ICON_SIZE = 48;
const ICON_RADIUS = 12;

const ICON_COLORS = [
  '#E84855', '#F67828', '#F5B700', '#44AF69',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
] as const;

export function ExercisePickerScreen({ navigation, route }: RootScreenProps<'ExercisePicker'>) {
  const { palette, spacing, radii } = useTheme();
  const dayIndex = route.params.dayIndex as WeekdayIndex;
  const dayLabel = WEEKDAY_LABELS[dayIndex];

  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const weeklyPlan: WeeklyPlan = prefs.weeklyPlan ?? {};
  const dayEntries = weeklyPlan[dayIndex] ?? [];

  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const MAX_PER_DAY = 15;

  // Count how many times each exercise is already added for this day
  const addedCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of dayEntries) map.set(e.activityId, (map.get(e.activityId) ?? 0) + 1);
    return map;
  }, [dayEntries]);
  const atLimit = dayEntries.length >= MAX_PER_DAY;

  const addExercise = (entry: WeeklyExerciseEntry) => {
    if (atLimit) return;
    const next = { ...weeklyPlan };
    next[dayIndex] = [...(next[dayIndex] ?? []), entry];
    setPreferences({ weeklyPlan: next });
  };

  // Filter ear exercises
  const filteredEar = useMemo(() => {
    if (!query) return EXERCISES;
    return EXERCISES.filter((e) => e.title.toLowerCase().includes(query));
  }, [query]);

  // Group melody exercises by category, filtered
  const filteredCategories = useMemo(() => {
    const cats = categoriesInOrder();
    const byCategory = new Map<string, Exercise[]>();
    for (const e of exercises) {
      if (query && !e.title.toLowerCase().includes(query)) continue;
      const list = byCategory.get(e.category) ?? [];
      list.push(e);
      byCategory.set(e.category, list);
    }
    return cats
      .map((meta) => ({ meta, items: byCategory.get(meta.id) ?? [] }))
      .filter(({ items }) => items.length > 0);
  }, [query]);

  // Look up catalog activity for minutes display
  const catalogMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of CATALOG) map.set(a.id, a.minutes);
    return map;
  }, []);

  let colorIndex = 0;

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <AppText
        variant="title"
        style={{ fontSize: 28, marginTop: spacing.sm }}
      >
        Add exercise
      </AppText>
      <AppText variant="body" style={{ marginTop: spacing.xs }}>
        Choose exercises for {dayLabel} · {dayEntries.length}/{MAX_PER_DAY}
      </AppText>

      <View style={[styles.searchContainer, { backgroundColor: palette.surface, borderRadius: radii.md, marginTop: spacing.md, marginBottom: spacing.md }]}>
        <Ionicons name="search" size={18} color={palette.textFaint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={palette.textFaint}
          style={[styles.searchInput, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.textFaint} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Ear-training drills */}
        {filteredEar.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <AppText variant="label" color={palette.textPrimary} style={{ fontSize: 16, marginBottom: spacing.sm }}>
              Listen & sing drills
            </AppText>
            {filteredEar.map((exercise) => {
              const count = addedCounts.get(exercise.id) ?? 0;
              const minutes = catalogMap.get(exercise.id) ?? 2;
              const bgColor = ICON_COLORS[colorIndex++ % ICON_COLORS.length];
              return (
                <EarPickerRow
                  key={exercise.id}
                  exercise={exercise}
                  minutes={minutes}
                  bgColor={bgColor}
                  count={count}
                  disabled={atLimit}
                  onSelect={(difficultyId) =>
                    addExercise({ activityId: exercise.id, kind: 'ear', difficultyId })
                  }
                />
              );
            })}
          </View>
        )}

        {/* Melody exercises by category */}
        {filteredCategories.map(({ meta, items }) => (
          <View key={meta.id} style={{ marginTop: spacing.lg }}>
            <AppText variant="label" color={palette.textPrimary} style={{ fontSize: 16, marginBottom: spacing.sm }}>
              {meta.label}
            </AppText>
            {items.map((e) => {
              const count = addedCounts.get(e.id) ?? 0;
              const minutes = catalogMap.get(e.id) ?? 3;
              const bgColor = ICON_COLORS[colorIndex++ % ICON_COLORS.length];
              const catIcon = EXERCISE_CAT_ICONS[e.id] ?? DEFAULT_CAT_ICON;
              const inset = catIcon.inset ?? 0;
              const imgSize = ICON_SIZE - inset * 2;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => !atLimit && addExercise({ activityId: e.id, kind: 'melody' })}
                  disabled={atLimit}
                  accessibilityRole="button"
                >
                  {({ pressed }) => (
                    <View style={[styles.row, (pressed && !atLimit) && { opacity: 0.7 }, atLimit && { opacity: 0.4 }]}>
                      <View style={[styles.icon, { backgroundColor: bgColor }]}>
                        <Image source={catIcon.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="label" style={{ fontSize: 15 }}>
                          {e.title}
                        </AppText>
                        <AppText variant="caption" style={{ marginTop: 1 }}>
                          {minutes} min · {e.source}
                          {count > 0 ? ` · ${count}x added` : ''}
                        </AppText>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {filteredEar.length === 0 && filteredCategories.length === 0 && (
          <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
            <AppText variant="body" color={palette.textSecondary}>
              No exercises match "{search}"
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Row for an ear-training exercise — if it has difficulties, shows chips on press. */
function EarPickerRow({
  exercise,
  minutes,
  bgColor,
  count,
  disabled,
  onSelect,
}: {
  exercise: ExerciseDefinition;
  minutes: number;
  bgColor: string;
  count: number;
  disabled: boolean;
  onSelect: (difficultyId?: string) => void;
}) {
  const { palette, spacing } = useTheme();
  const [showDifficulties, setShowDifficulties] = useState(false);
  const catIcon = EXERCISE_CAT_ICONS[exercise.id] ?? DEFAULT_CAT_ICON;
  const inset = catIcon.inset ?? 0;
  const imgSize = ICON_SIZE - inset * 2;

  const handlePress = () => {
    if (disabled) return;
    if (exercise.difficulties && exercise.difficulties.length > 1) {
      setShowDifficulties(true);
    } else {
      onSelect(exercise.defaultDifficulty);
    }
  };

  return (
    <View>
      <Pressable onPress={handlePress} disabled={disabled} accessibilityRole="button">
        {({ pressed }) => (
          <View style={[styles.row, (pressed && !disabled) && { opacity: 0.7 }, disabled && { opacity: 0.4 }]}>
            <View style={[styles.icon, { backgroundColor: bgColor }]}>
              <Image source={catIcon.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" style={{ fontSize: 15 }}>
                {exercise.title}
              </AppText>
              <AppText variant="caption" style={{ marginTop: 1 }}>
                {minutes} min{count > 0 ? ` · ${count}x added` : ''}
              </AppText>
            </View>
          </View>
        )}
      </Pressable>

      {showDifficulties && exercise.difficulties && (
        <View style={styles.difficultyChips}>
          {exercise.difficulties.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => onSelect(d.id)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: 'rgba(200, 218, 89, 0.12)' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <AppText variant="caption" color={palette.accent} style={{ fontSize: 13 }}>
                {d.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  difficultyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: ICON_SIZE + 12,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
});
