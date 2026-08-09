/**
 * The weekly report: practice consistency, mastery movement, weakest area,
 * and the recommended focus for next week — assembled by the pure weekly
 * service from progress history + the learning profile.
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FOCUS_TITLES,
  SKILL_LABELS,
  buildWeeklyReview,
  useLearningStore,
  usePreferencesStore,
  weekKeyOf,
} from '@/features/learning';
import { currentStreak, formatPracticeTime, localDayKey, useProgressStore } from '@/features/progress';
import { AppText, BackButton, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function WeeklyReviewScreen({ navigation }: ProfileScreenProps<'WeeklyReview'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);
  const weeklyFocus = useLearningStore((s) => s.weeklyFocus);
  const weekSnapshots = useLearningStore((s) => s.weekSnapshots);
  const prefs = usePreferencesStore((s) => s.preferences);

  const report = useMemo(() => {
    const now = Date.now();
    const weekKey = weekKeyOf(now);
    // the week runs Monday → now; weekKey encodes that Monday
    const [y, m, d] = weekKey.split('-').map(Number);
    const weekStart = new Date(y, m, d).getTime();
    const thisWeek = sessions.filter((s) => s.at >= weekStart);
    return buildWeeklyReview({
      weekKey,
      focus: weeklyFocus?.skill ?? null,
      skills,
      startOfWeekMastery: weekSnapshots.find((w) => w.weekKey === weekKey)?.mastery ?? null,
      annotations: annotations.filter((a) => a.sessionAt >= weekStart),
      daysPracticed: new Set(thisWeek.map((s) => localDayKey(s.at))).size,
      sessions: thisWeek.length,
      practiceSeconds: thisWeek.reduce((sum, s) => sum + (s.durationSec ?? 0), 0),
      streak: currentStreak(sessions),
      prefs,
    });
  }, [sessions, skills, annotations, weeklyFocus, weekSnapshots, prefs]);

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40, marginTop: spacing.sm }}>
          Weekly review
        </AppText>
        {report.focus && (
          <AppText variant="body" style={{ marginTop: spacing.xs }}>
            {FOCUS_TITLES[report.focus]}
          </AppText>
        )}

        <View style={styles.tiles}>
          <Tile label="Days" value={String(report.daysPracticed)} icon="calendar" />
          <Tile label="Sessions" value={String(report.sessions)} icon="musical-notes" />
          <Tile label="Time" value={formatPracticeTime(report.practiceSeconds)} icon="time" />
          <Tile label="Days in a row" value={`${report.streak}d`} icon="star" />
        </View>

        <Card style={[styles.card, { marginTop: spacing.md }]}>
          <AppText variant="caption">This week in plain language</AppText>
          {report.summary.map((line) => (
            <AppText key={line} variant="body" style={{ marginTop: 8, fontSize: 14 }}>
              {line}
            </AppText>
          ))}
        </Card>

        {report.masteryChanges.length > 0 && (
          <Card style={[styles.card, { marginTop: spacing.md }]}>
            <AppText variant="caption">Mastery changes</AppText>
            {report.masteryChanges.map((change) => (
              <View key={change.skill} style={styles.changeRow}>
                <AppText variant="body" style={{ flex: 1, fontSize: 14 }}>
                  {SKILL_LABELS[change.skill]}
                </AppText>
                <AppText variant="caption">
                  {change.from} → {change.to}
                </AppText>
                <Ionicons
                  name={change.to > change.from ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={change.to > change.from ? palette.accent : palette.warning}
                />
              </View>
            ))}
          </Card>
        )}

        <Card variant="highlighted" style={[styles.card, { marginTop: spacing.md }]}>
          <AppText variant="caption">Next week</AppText>
          <AppText variant="label" style={{ fontSize: 17, marginTop: 4 }}>
            {FOCUS_TITLES[report.recommendedFocus]}
          </AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Card style={styles.tile}>
      <IconBubble name={icon} size={28} iconSize={13} />
      <AppText variant="label" style={{ fontSize: 17, marginTop: 4 }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tile: { flex: 1, padding: 12, alignItems: 'flex-start' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
});
