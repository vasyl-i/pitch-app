/**
 * The Journey: what you've learned, told as musical abilities in outcome
 * language. Each area shows milestone progress; tapping opens the detail.
 * This is a map of growth, not an exercise launcher.
 */
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildJourney, useLearningStore, type JourneyArea } from '@/features/learning';
import { AppText, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function JourneyScreen({ navigation }: ProfileScreenProps<'JourneyOverview'>) {
  const { spacing } = useTheme();
  const skills = useLearningStore((s) => s.skills);
  const journey = useMemo(() => buildJourney(skills), [skills]);

  return (
    <Screen>
      <AppText variant="title" style={{ fontSize: 40 }}>
        Your journey
      </AppText>
      <AppText variant="body" style={{ marginTop: spacing.xs }}>
        Every ability you’re building, one milestone at a time.
      </AppText>

      <FlatList
        data={journey}
        keyExtractor={(area) => area.category}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing.lg, paddingBottom: spacing.xxl }}
        renderItem={({ item }) => (
          <AreaCard area={item} onPress={() => navigation.navigate('JourneyArea', { category: item.category })} />
        )}
      />
    </Screen>
  );
}

function AreaCard({ area, onPress }: { area: JourneyArea; onPress: () => void }) {
  const { palette } = useTheme();
  const progress = area.totalCount === 0 ? 0 : area.doneCount / area.totalCount;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }}>
              {area.title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 3 }}>
              {area.started ? `${area.doneCount} of ${area.totalCount} milestones` : area.tagline}
            </AppText>
            <View style={[styles.track, { backgroundColor: palette.borderSubtle }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: area.started ? palette.accent : palette.borderSubtle, width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 3, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
});
