/**
 * The Progress tab: growth made visible. Stats, trends, insights, calendar,
 * and doorways into the weekly review and the perfect-runs list. Shows what
 * happened — never a place to pick exercises.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PracticeCalendar,
  WeeklyAccuracyChart,
  formatPracticeTime,
  localDayKey,
  practicedDayKeys,
  perfectExercises,
  totalPracticeDays,
  totalPracticeSeconds,
  useProgressStore,
  weeklyAccuracyTrend,
  weeklyStats,
} from '@/features/progress';
import { buildSessionInsights, useLearningStore } from '@/features/learning';
import { AppText, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function ProgressScreen({ navigation }: ProfileScreenProps<'ProgressOverview'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const skills = useLearningStore((s) => s.skills);
  const annotations = useLearningStore((s) => s.annotations);

  const week = useMemo(() => weeklyStats(sessions), [sessions]);
  const trend = useMemo(() => weeklyAccuracyTrend(sessions), [sessions]);
  const perfectCount = useMemo(() => perfectExercises(sessions).length, [sessions]);
  const practiceDays = useMemo(() => totalPracticeDays(sessions), [sessions]);
  const practiceTime = useMemo(() => formatPracticeTime(totalPracticeSeconds(sessions)), [sessions]);
  const calendarDays = useMemo(() => practicedDayKeys(sessions), [sessions]);

  const insights = useMemo(() => {
    const today = localDayKey(Date.now());
    const todays = annotations.filter((a) => localDayKey(a.sessionAt) === today);
    return buildSessionInsights(annotations[0] ?? null, todays, skills);
  }, [annotations, skills]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <AppText variant="title" style={{ fontSize: 40 }}>
          Progress
        </AppText>

        {sessions.length === 0 ? (
          <Card style={[styles.card, { marginTop: spacing.lg }]}>
            <AppText variant="body">
              Nothing here yet. Finish today’s practice on Home and your progress starts building.
            </AppText>
          </Card>
        ) : (
          <>
            <View style={styles.tiles}>
              <Tile
                label="Perfect runs"
                value={String(perfectCount)}
                icon="trophy"
                onPress={() => navigation.navigate('PerfectExercises')}
              />
              <Tile label="Days practiced" value={practiceDays > 0 ? `${practiceDays}d` : '—'} icon="star" />
              <Tile label="Practice time" value={practiceTime} icon="time" />
            </View>

            {insights.length > 0 && (
              <Card style={[styles.card, { marginTop: spacing.md }]}>
                <AppText variant="caption">After your last session</AppText>
                {insights.map((insight) => (
                  <View key={insight.text} style={styles.insightRow}>
                    <Ionicons
                      name={insight.kind === 'improvement' ? 'trending-up' : insight.kind === 'decline' ? 'trending-down' : 'analytics'}
                      size={14}
                      color={insight.kind === 'improvement' ? palette.accent : palette.textFaint}
                    />
                    <AppText variant="body" style={{ flex: 1, fontSize: 14 }}>
                      {insight.text}
                    </AppText>
                  </View>
                ))}
              </Card>
            )}

            <Card style={[styles.card, { marginTop: spacing.md }]}>
              <View style={styles.rowBetween}>
                <AppText variant="caption">Weekly accuracy</AppText>
                {week.scoreDelta !== null && week.scoreDelta !== 0 && (
                  <AppText variant="caption" color={week.scoreDelta > 0 ? palette.accent : palette.warning}>
                    {week.scoreDelta > 0 ? '▲' : '▼'} {Math.abs(week.scoreDelta)} vs last week
                  </AppText>
                )}
              </View>
              <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
                <AppText variant="label" style={{ fontSize: 40 }}>
                  {week.avgScore}
                </AppText>
                <AppText variant="caption">avg score · {week.avgCents}¢ avg deviation</AppText>
              </View>
            </Card>

            <Card style={[styles.card, { marginTop: spacing.md }]}>
              <AppText variant="caption">Accuracy trend</AppText>
              <View style={{ marginTop: spacing.md }}>
                <WeeklyAccuracyChart points={trend} />
              </View>
            </Card>

            <Card style={[styles.card, { marginTop: spacing.md }]}>
              <PracticeCalendar practicedDays={calendarDays} />
            </Card>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('WeeklyReview')}
          style={{ marginTop: spacing.md }}
        >
          {({ pressed }) => (
            <Card style={[styles.card, styles.navRow, pressed && { opacity: 0.85 }]}>
              <Ionicons name="calendar" size={18} color={palette.accent} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ fontSize: 15 }}>
                  Weekly review
                </AppText>
                <AppText variant="caption" style={{ fontSize: 11 }}>
                  What moved this week, and what’s next
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </Card>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Tile({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const { palette, typography } = useTheme();
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Card style={[styles.tile, pressed && onPress && { opacity: 0.85 }]}>
          <Ionicons name={icon} size={22} color={palette.accent} />
          <AppText style={{ fontFamily: typography.family.bold, fontSize: 26, lineHeight: 32, marginTop: 10 }}>{value}</AppText>
          <AppText variant="caption" style={{ fontSize: 12, marginTop: 2 }}>
            {label}
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 18 },
  tile: { padding: 18, alignItems: 'flex-start' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
});
