/**
 * The end of today's guided practice: a warm close-out with what you did,
 * your streak, and one exit back Home. No decisions, just the win.
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLessonSessionStore } from '@/features/learning';
import { currentStreak, formatPracticeTime, localDayKey, useProgressStore } from '@/features/progress';
import { AppText, Button, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

export function PracticeCompleteScreen({ navigation }: RootScreenProps<'PracticeComplete'>) {
  const { palette, spacing } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const steps = useLessonSessionStore((s) => s.steps);

  const streak = useMemo(() => currentStreak(sessions), [sessions]);
  const today = useMemo(() => {
    const key = localDayKey(Date.now());
    const todays = sessions.filter((s) => localDayKey(s.at) === key);
    const seconds = todays.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
    return { count: todays.length, time: formatPracticeTime(seconds) };
  }, [sessions]);

  return (
    <Screen>
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={64} color={palette.accent} />
        <AppText variant="title" style={{ fontSize: 26, marginTop: spacing.lg, textAlign: 'center' }}>
          That’s today’s practice
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {steps.length} steps done. Showing up is the whole secret — see you tomorrow.
        </AppText>

        <View style={[styles.tiles, { marginTop: spacing.xl }]}>
          <Tile icon="star" value={`${streak}d`} label="Days in a row" />
          <Tile icon="musical-notes" value={String(today.count)} label="Sessions today" />
          <Tile icon="time" value={today.time} label="Time today" />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          title="Done"
          onPress={() => navigation.navigate('Main', { screen: 'HomeTab', params: { screen: 'Today' } })}
        />
        <Button
          title="See your progress"
          variant="ghost"
          onPress={() => navigation.navigate('Main', { screen: 'AccountTab', params: { screen: 'ProgressOverview' } })}
        />
      </View>
    </Screen>
  );
}

function Tile({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <IconBubble name={icon} size={32} iconSize={14} />
      <AppText variant="label" style={{ fontSize: 18, marginTop: 6 }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 14, alignItems: 'flex-start' },
});
