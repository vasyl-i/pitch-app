/**
 * The Journey: what you've learned, told as musical abilities in outcome
 * language. Each area shows milestone progress; tapping opens the detail.
 * This is a map of growth, not an exercise launcher.
 */
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildJourney, useLearningStore, type JourneyArea } from '@/features/learning';
import { AppText, Card, ProgressBar, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { ProgressScreenProps } from '@/app/navigation/types';

export function JourneyScreen({ navigation }: ProgressScreenProps<'JourneyOverview'>) {
  const { t, i18n } = useTranslation();
  const skills = useLearningStore((s) => s.skills);
  // area copy is resolved while building, so the language is a dependency too
  const journey = useMemo(() => buildJourney(skills), [skills, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen>
      <AppText variant="score">{t('journey.title')}</AppText>
      <AppText variant="body" style={styles.subtitle}>
        {t('journey.subtitle')}
      </AppText>
      <FlatList
        data={journey}
        keyExtractor={(area) => area.category}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <AreaCard area={item} onPress={() => navigation.navigate('JourneyArea', { category: item.category })} />}
      />
    </Screen>
  );
}

function AreaCard({ area, onPress }: { area: JourneyArea; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.fill}>
            <AppText variant="label">{area.title}</AppText>
            <AppText variant="caption" style={styles.meta}>
              {area.started ? t('journey.milestonesCount', { done: area.doneCount, count: area.totalCount }) : area.tagline}
            </AppText>
            <View style={styles.bar}>
              <ProgressBar
                progress={area.totalCount === 0 ? 0 : area.doneCount / area.totalCount}
                color={area.started ? palette.accent : palette.borderSubtle}
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
  subtitle: { marginTop: spacing.xs },
  list: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  card: { padding: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.85 },
  fill: { flex: 1 },
  meta: { marginTop: 3 },
  bar: { marginTop: 10 },
});
