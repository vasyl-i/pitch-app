/**
 * One ability up close: mastery, milestones (done → current → locked),
 * strengths, and what's being worked on. Completed and current milestones can
 * optionally be replayed as free practice — a side door, never the main path,
 * which stays the guided daily practice on Home.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildJourneyArea,
  nodeActivity,
  useLearningStore,
  type JourneyMilestone,
} from '@/features/learning';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function JourneyAreaScreen({ navigation, route }: ProfileScreenProps<'JourneyArea'>) {
  const { palette, spacing } = useTheme();
  const skills = useLearningStore((s) => s.skills);
  const area = useMemo(() => buildJourneyArea(route.params.category, skills), [route.params.category, skills]);

  const strongest = area.skills.find((s) => s.state.exercisesCompleted > 0);
  const workingOn = [...area.skills].reverse().find((s) => s.state.exercisesCompleted > 0);

  const replay = (m: JourneyMilestone) => {
    const activity = nodeActivity(m.node);
    if (!activity) return;
    if (activity.kind === 'melody') {
      navigation.navigate('MelodyPractice', { exerciseId: activity.id });
    } else {
      navigation.navigate('EarSession', { exerciseId: activity.id, difficultyId: m.node.difficultyId });
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40, marginTop: spacing.sm }}>
          {area.title}
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          {area.tagline}
        </AppText>

        <Card style={[styles.card, { marginTop: spacing.lg }]}>
          <View style={styles.rowBetween}>
            <AppText variant="caption">Where you are</AppText>
            <AppText variant="caption">
              {area.doneCount} of {area.totalCount} milestones
            </AppText>
          </View>
          <View style={[styles.track, { backgroundColor: palette.borderSubtle, marginTop: spacing.md }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: palette.accent,
                  width: `${area.totalCount === 0 ? 0 : Math.round((area.doneCount / area.totalCount) * 100)}%`,
                },
              ]}
            />
          </View>
          {(strongest || workingOn) && (
            <View style={{ marginTop: spacing.md, gap: 6 }}>
              {strongest && (
                <View style={styles.skillRow}>
                  <Ionicons name="sparkles" size={13} color={palette.accent} />
                  <AppText variant="caption">
                    Strongest: {strongest.label} — {strongest.bandLabel.toLowerCase()}
                  </AppText>
                </View>
              )}
              {workingOn && workingOn.skill !== strongest?.skill && (
                <View style={styles.skillRow}>
                  <Ionicons name="trending-up" size={13} color={palette.textFaint} />
                  <AppText variant="caption">
                    Growing: {workingOn.label} — {workingOn.bandLabel.toLowerCase()}
                  </AppText>
                </View>
              )}
            </View>
          )}
          <AppText variant="caption" style={{ marginTop: spacing.md }}>
            Your daily practice on Home moves this forward automatically.
          </AppText>
        </Card>

        <AppText variant="caption" style={[styles.sectionHeader, { color: palette.textFaint }]}>
          Milestones
        </AppText>
        {area.milestones.map((m) => (
          <MilestoneRow key={m.node.id} milestone={m} onReplay={() => replay(m)} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function MilestoneRow({ milestone, onReplay }: { milestone: JourneyMilestone; onReplay: () => void }) {
  const m = milestone;
  const actionable = m.state === 'done' || m.state === 'current';
  // plain glyphs, not the filled "-circle" variants — those draw their own
  // solid disc, which turns into an inverted white blob once IconBubble
  // forces it to a single white color instead of sitting on its blur circle
  const icon = m.state === 'done' ? 'checkmark' : m.state === 'current' ? 'play' : m.state === 'upcoming' ? 'ellipse-outline' : 'lock-closed';
  const caption =
    m.state === 'done'
      ? 'Completed'
      : m.state === 'current'
        ? 'Where you are now'
        : m.state === 'upcoming'
          ? 'Coming up'
          : (m.lockedHint ?? 'Locked for now');

  const content = (pressed?: boolean) => (
    <Card style={[styles.milestone, m.state === 'locked' && { opacity: 0.55 }, pressed && { opacity: 0.85 }]}>
      <IconBubble name={icon} size={36} iconSize={16} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" style={{ fontSize: 15 }}>
          {m.node.title}
        </AppText>
        <AppText variant="caption" style={{ fontSize: 11, marginTop: 2 }}>
          {caption}
        </AppText>
      </View>
    </Card>
  );

  if (!actionable) return content();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={m.state === 'done' ? 'Replay' : 'Practice'} onPress={onReplay}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { fontSize: 13, marginTop: 24, marginBottom: 10 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  milestone: { padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
