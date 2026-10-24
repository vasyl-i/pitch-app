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
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aggregateHistory, catalogForTier, findWeakSpots, useLearningStore, type WeakSpot } from '@/features/learning';
import { useProgressStore } from '@/features/progress';
import { PremiumBadge } from '@/features/subscription';
import { AppText, BackButton, Card, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { SpotCard } from './SpotCard';

export function WeakSpotsScreen({ navigation }: RootScreenProps<'WeakSpots'>) {
  const { t, i18n } = useTranslation();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);

  // spot copy is built here, so rebuild it if the language changes
  const spots = useMemo(
    () => findWeakSpots({ ...aggregateHistory(sessions), skills, catalog: catalogForTier('premium') }, 6),
    [sessions, skills, i18n.language], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const open = ({ activity }: WeakSpot) => {
    if (!activity) return;
    if (activity.kind === 'melody') navigation.navigate('MelodyPractice', { exerciseId: activity.id });
    else navigation.navigate('EarSession', { exerciseId: activity.id, difficultyId: activity.difficulties?.[0] });
  };

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <PremiumBadge />
        <AppText variant="headline" style={styles.title}>
          {t('sing.hub.weakSpotsTitle')}
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          {t('weakSpots.subtitle')}
        </AppText>

        {spots.length === 0 ? (
          <Card style={styles.empty}>
            <Ionicons name="analytics-outline" size={22} color={palette.accent} />
            <AppText variant="label" style={styles.emptyTitle}>
              {t('weakSpots.emptyTitle')}
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              {t('weakSpots.emptyBody')}
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} onPress={() => open(spot)} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { marginTop: spacing.sm },
  subtitle: { marginTop: spacing.xs },
  empty: { alignItems: 'flex-start', marginTop: spacing.xl, padding: spacing.lg },
  emptyTitle: { marginTop: spacing.sm },
  list: { marginTop: spacing.lg, gap: spacing.sm },
});
