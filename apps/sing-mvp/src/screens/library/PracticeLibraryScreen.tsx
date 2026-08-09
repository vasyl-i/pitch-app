/**
 * The practice library: the free-practice sandbox, tucked under Profile.
 * The guided daily practice on Home stays the main path; this is for exploring
 * on your own terms.
 *
 * Sections are driven by the category registry (`entities/exercise/categories`),
 * so a new family of exercises appears here — correctly tiered, correctly
 * ordered — without this screen changing. Premium categories are shown rather
 * than hidden: a locked section that names real exercises tells a free user
 * what the advanced library actually contains, which an invisible one cannot.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriesInOrder, exercises, type Exercise, type ExerciseCategoryMeta } from '@/entities/exercise';
import { EXERCISES } from '@/features/ear-training';
import { bestScores, starsForScore, useProgressStore } from '@/features/progress';
import { PremiumBadge, useEntitlement, usePaywall } from '@/features/subscription';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function PracticeLibraryScreen({ navigation }: ProfileScreenProps<'PracticeLibrary'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const best = useMemo(() => bestScores(sessions), [sessions]);
  const [levels, setLevels] = useState<Record<string, string>>({});

  const advancedUnlocked = useEntitlement('advanced-library');
  const openPaywall = usePaywall('practice-library', 'advanced-library');

  const byCategory = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of exercises) {
      const list = map.get(e.category) ?? [];
      list.push(e);
      map.set(e.category, list);
    }
    return map;
  }, []);

  const openMelody = (e: Exercise) => navigation.navigate('MelodyPractice', { exerciseId: e.id });

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40, marginTop: spacing.sm }}>
          Practice library
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Anything, any time. Your daily practice already covers what matters most — this is for exploring.
        </AppText>

        {categoriesInOrder().map((meta) => {
          const items = byCategory.get(meta.id) ?? [];
          if (items.length === 0) return null;
          const locked = meta.tier === 'premium' && !advancedUnlocked;
          return (
            <View key={meta.id}>
              <SectionHeader label={meta.label} tagline={meta.tagline} locked={locked} />
              {items.map((e) =>
                locked ? (
                  <LockedRow key={e.id} exercise={e} onPress={openPaywall} />
                ) : (
                  <MelodyRow key={e.id} exercise={e} best={best[e.id]} onPress={() => openMelody(e)} />
                )
              )}
            </View>
          );
        })}

        <SectionHeader label="Listen & sing drills" tagline="" locked={false} />
        {EXERCISES.map((exercise) => {
          const selected = levels[exercise.id] ?? exercise.defaultDifficulty ?? undefined;
          return (
            <Pressable
              key={exercise.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('EarSession', { exerciseId: exercise.id, difficultyId: selected })}
            >
              {({ pressed }) => (
                <Card style={[styles.card, pressed && { opacity: 0.85 }]}>
                  <AppText variant="label" style={{ fontSize: 16 }}>
                    {exercise.title}
                  </AppText>
                  <AppText variant="caption" style={{ marginTop: 3 }}>
                    {exercise.tagline}
                  </AppText>
                  {exercise.difficulties && (
                    <View style={styles.chips}>
                      {exercise.difficulties.map((level) => {
                        const isSelected = level.id === selected;
                        return (
                          <Pressable
                            key={level.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => setLevels((prev) => ({ ...prev, [exercise.id]: level.id }))}
                            style={[
                              styles.chip,
                              { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                            ]}
                          >
                            <AppText variant="caption" color={isSelected ? palette.accent : palette.textSecondary}>
                              {level.label}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </Card>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ label, tagline, locked }: { label: string; tagline: string; locked: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionHeaderBlock}>
      <View style={styles.sectionTitleRow}>
        <AppText variant="caption" style={[styles.sectionHeader, { color: palette.textFaint }]}>
          {label}
        </AppText>
        {locked && <PremiumBadge locked />}
      </View>
      {tagline.length > 0 && (
        <AppText variant="caption" style={{ fontSize: 11, marginBottom: 10 }}>
          {tagline}
        </AppText>
      )}
    </View>
  );
}

/** a Premium exercise shown to a free user: named, but not launchable */
function LockedRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.title} — Premium exercise`}
      accessibilityHint="Opens the Premium plans"
      onPress={onPress}
    >
      {({ pressed }) => (
        <Card style={[styles.card, styles.melodyRow, { opacity: pressed ? 0.75 : 0.55 }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }}>
              {exercise.title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 3 }}>
              {exercise.source} · {exercise.key}
            </AppText>
          </View>
          <Ionicons name="lock-closed" size={16} color={palette.textFaint} />
        </Card>
      )}
    </Pressable>
  );
}

function MelodyRow({ exercise, best, onPress }: { exercise: Exercise; best: number | undefined; onPress: () => void }) {
  const { palette } = useTheme();
  const earned = best === undefined ? 0 : starsForScore(best);
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, styles.melodyRow, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }}>
              {exercise.title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 3 }}>
              {exercise.source} · {exercise.key}
            </AppText>
            {best !== undefined && (
              <View style={styles.starRow}>
                {[0, 1, 2].map((i) => (
                  <Ionicons key={i} name={i < earned ? 'star' : 'star-outline'} size={11} color={i < earned ? palette.accent : palette.textFaint} />
                ))}
                <AppText variant="caption" style={{ fontSize: 10, marginLeft: 4 }}>
                  best {best}
                </AppText>
              </View>
            )}
          </View>
          <IconBubble name="play" size={40} iconSize={18} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeaderBlock: { marginTop: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeader: { fontSize: 13, marginBottom: 6 },
  card: { padding: 16, marginBottom: 8 },
  melodyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
});
