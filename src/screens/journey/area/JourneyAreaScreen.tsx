/**
 * One ability up close: mastery, milestones (done → current → locked),
 * strengths, and what's being worked on. Completed and current milestones can
 * optionally be replayed as free practice — a side door, never the main path,
 * which stays the guided daily practice on Home.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, BackButton, Card, ProgressBar, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { ProgressScreenProps } from '@/app/navigation/types';
import { useJourneyArea } from './useJourneyArea';
import { MilestoneRow } from './MilestoneRow';

export function JourneyAreaScreen({ navigation, route }: ProgressScreenProps<'JourneyArea'>) {
  const { t } = useTranslation();
  const { area, strongest, workingOn, replay } = useJourneyArea(route.params.category, navigation);

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="score" style={styles.title}>
          {area.title}
        </AppText>
        <AppText variant="body" style={styles.tagline}>
          {area.tagline}
        </AppText>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <AppText variant="caption">{t('journey.whereYouAre')}</AppText>
            <AppText variant="caption">{t('journey.milestonesCount', { done: area.doneCount, count: area.totalCount })}</AppText>
          </View>
          <View style={styles.bar}>
            <ProgressBar progress={area.totalCount === 0 ? 0 : area.doneCount / area.totalCount} height={4} />
          </View>
          {(strongest || workingOn) && (
            <View style={styles.skills}>
              {strongest && (
                <SkillNote icon="sparkles" color={palette.accent} text={t('journey.strongest', { skill: strongest.label, band: strongest.bandLabel.toLowerCase() })} />
              )}
              {workingOn && (
                <SkillNote icon="trending-up" color={palette.textFaint} text={t('journey.growing', { skill: workingOn.label, band: workingOn.bandLabel.toLowerCase() })} />
              )}
            </View>
          )}
          <AppText variant="caption" style={styles.autoProgress}>
            {t('journey.autoProgress')}
          </AppText>
        </Card>

        <AppText variant="small" color={palette.textFaint} style={styles.section}>
          {t('journey.milestones')}
        </AppText>
        {area.milestones.map((m) => (
          <MilestoneRow key={m.node.id} milestone={m} onReplay={() => replay(m)} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function SkillNote({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={styles.skill}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { marginTop: spacing.sm },
  tagline: { marginTop: spacing.xs },
  card: { padding: spacing.lg, marginTop: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { marginTop: spacing.md },
  skills: { marginTop: spacing.md, gap: 6 },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoProgress: { marginTop: spacing.md },
  section: { marginTop: spacing.xl, marginBottom: 10 },
});
