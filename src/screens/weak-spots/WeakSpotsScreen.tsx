/**
 * "Practice Your Weak Spots" — the Premium drill list generated from what this
 * singer actually keeps missing.
 *
 * The screen holds no analysis of its own: it calls the weak-spot engine and
 * renders. Every card shows the evidence next to the drill, because a weakness
 * you're told about without being shown feels like an accusation, and one you
 * can see the measurement for feels like coaching.
 *
 * When there isn't enough history yet, this says so plainly rather than
 * inventing weaknesses to fill the screen.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  aggregateHistory,
  catalogForTier,
  findWeakSpots,
  useLearningStore,
  type WeakSpot,
} from '@/features/learning';
import { useProgressStore } from '@/features/progress';
import { PremiumBadge } from '@/features/subscription';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

export function WeakSpotsScreen({ navigation }: RootScreenProps<'WeakSpots'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);

  const spots = useMemo(() => {
    const history = aggregateHistory(sessions);
    return findWeakSpots({ ...history, skills, catalog: catalogForTier('premium') }, 6);
  }, [sessions, skills]);

  const open = (spot: WeakSpot) => {
    const activity = spot.activity;
    if (!activity) return;
    if (activity.kind === 'melody') {
      navigation.navigate('MelodyPractice', { exerciseId: activity.id });
    } else {
      navigation.navigate('EarSession', { exerciseId: activity.id, difficultyId: activity.difficulties?.[0] });
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PremiumBadge />
        <AppText variant="title" style={{ fontSize: 36, marginTop: spacing.sm }}>
          Practice your weak spots
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Built from your last two months of practice. These are the specific things your voice keeps slipping on.
        </AppText>

        {spots.length === 0 ? (
          <Card style={[styles.empty, { marginTop: spacing.xl, padding: spacing.lg }]}>
            <Ionicons name="analytics-outline" size={22} color={palette.accent} />
            <AppText variant="label" style={{ fontSize: 16, marginTop: spacing.sm }}>
              Not enough data yet
            </AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>
              Your coach needs a few more sessions before it can name a weak spot honestly. Keep practising — this fills
              in on its own.
            </AppText>
          </Card>
        ) : (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} onPress={() => open(spot)} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const KIND_ICON: Record<WeakSpot['kind'], keyof typeof Ionicons.glyphMap> = {
  interval: 'swap-vertical',
  register: 'trending-up',
  note: 'musical-note',
  stability: 'pulse',
  rhythm: 'timer-outline',
  skill: 'school-outline',
};

function SpotCard({ spot, onPress }: { spot: WeakSpot; onPress: () => void }) {
  const { palette, spacing } = useTheme();
  const playable = spot.activity !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${spot.title}. ${spot.evidence}`}
      disabled={!playable}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Card style={[styles.card, { padding: spacing.lg }, pressed && { opacity: 0.85 }]}>
          <View style={styles.headRow}>
            <IconBubble name={KIND_ICON[spot.kind]} size={36} iconSize={16} />
            <AppText variant="label" style={{ fontSize: 16, flex: 1 }}>
              {spot.title}
            </AppText>
            {playable && <Ionicons name="play-circle" size={22} color={palette.accent} />}
          </View>

          <AppText variant="caption" style={{ marginTop: 6 }}>
            {spot.evidence}
          </AppText>

          {playable && (
            <AppText variant="caption" color={palette.textSecondary} style={{ marginTop: 8, fontSize: 11 }}>
              Drill: {spot.activity?.title}
            </AppText>
          )}
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { alignItems: 'flex-start' },
});
