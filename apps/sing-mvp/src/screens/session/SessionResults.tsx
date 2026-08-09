/**
 * The one results screen every exercise ends on: overall score, accuracy
 * metrics, coaching, and an expandable per-round breakdown with expected vs
 * detected notes, the melody overlay where applicable, and answer replay.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  exerciseById,
  useEarTrainingStore,
  type NoteOutcome,
  type OutcomeStatus,
} from '@/features/ear-training';
import { PremiumGate } from '@/features/subscription';
import { useTheme } from '@/shared/theme';
import { AppText, Button, Card } from '@/shared/ui';
import { MelodyOverlay } from './MelodyOverlay';

interface SessionControls {
  retry(): void;
  replayAnswer(roundIndex?: number): void;
}

/** the footer buttons — the host screen decides where the session leads next */
export interface ResultsActions {
  primary: { title: string; onPress: () => void };
  secondary: { title: string; onPress: () => void };
}

const STATUS_GLYPH: Record<OutcomeStatus, string> = {
  hit: '✓',
  close: '~',
  missing: '·',
  extra: '+',
  wrong: '✕',
};

function statusColor(status: OutcomeStatus, palette: { accent: string; warning: string; danger: string; textFaint: string }): string {
  switch (status) {
    case 'hit':
      return palette.accent;
    case 'close':
      return palette.warning;
    case 'missing':
      return palette.textFaint;
    default:
      return palette.danger;
  }
}

function NoteRows({ notes }: { notes: NoteOutcome[] }) {
  const { palette, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {notes.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="caption" color={statusColor(n.status, palette)}>
            {STATUS_GLYPH[n.status]} {n.label}
          </AppText>
          <AppText variant="caption">
            {n.status === 'missing' ? 'not heard' : n.status === 'extra' ? 'extra' : n.cents === null ? '' : `${n.cents > 0 ? '+' : ''}${n.cents}¢`}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** the locked stand-in for the target-vs-sung pitch overlay */
function LockedOverlay({ onPress }: { onPress: () => void }) {
  const { palette, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Performance overlay — Premium feature"
      accessibilityHint="Opens the Premium plans"
      onPress={onPress}
    >
      {({ pressed }) => (
        <Card variant="highlighted" style={[{ padding: spacing.md, alignItems: 'center', gap: 4 }, pressed && { opacity: 0.85 }]}>
          <AppText variant="caption" color={palette.accent}>
            See your pitch traced over the target
          </AppText>
          <AppText variant="caption" style={{ fontSize: 10, textAlign: 'center' }}>
            Premium overlays your attempt on the melody so you can spot exactly where the pitch drifts.
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing.sm }}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

export function SessionResults({ session, actions }: { session: SessionControls; actions: ResultsActions }) {
  const { palette, spacing } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);

  const exerciseId = useEarTrainingStore((s) => s.exerciseId);
  const results = useEarTrainingStore((s) => s.results);
  const summary = useEarTrainingStore((s) => s.summary);

  if (!summary) return null;
  const title = exerciseId ? (exerciseById(exerciseId)?.title ?? '') : '';

  return (
    <>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <AppText variant="display" color={summary.overall >= 70 ? palette.accent : palette.textPrimary}>
            {summary.overall}
          </AppText>
          <AppText variant="body">overall score</AppText>
          <AppText variant="caption" style={{ marginTop: spacing.xs }}>
            {summary.correctRounds} of {summary.totalRounds} rounds nailed
          </AppText>
        </View>

        <Card
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            marginTop: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          {summary.pitchAccuracy !== null && <Metric label="pitch" value={`${summary.pitchAccuracy}%`} />}
          {summary.rhythmAccuracy !== null && <Metric label="rhythm" value={`${summary.rhythmAccuracy}%`} />}
          {summary.avgCents !== null && <Metric label="avg off" value={`${summary.avgCents}¢`} />}
          {summary.pitchAccuracy === null && summary.avgCents === null && (
            <Metric label="correct" value={`${summary.correctRounds}/${summary.totalRounds}`} />
          )}
        </Card>

        <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          {summary.improvements.map((line, i) => (
            <AppText key={i} variant="caption" style={{ textAlign: 'center' }}>
              {line}
            </AppText>
          ))}
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          {results.map((r, i) => {
            const isOpen = expanded === i;
            return (
              <Pressable key={i} accessibilityRole="button" onPress={() => setExpanded(isOpen ? null : i)}>
                <Card style={{ padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="caption" color={r.ok ? palette.accent : palette.textSecondary}>
                      Round {i + 1} · {r.label}
                    </AppText>
                    <AppText variant="caption">{r.score}</AppText>
                  </View>
                  {isOpen && (
                    <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                      <View style={{ gap: 2 }}>
                        <AppText variant="caption">target: {r.expected}</AppText>
                        <AppText variant="caption">you: {r.actual}</AppText>
                        {r.avgCents !== null && <AppText variant="caption">average deviation: {r.avgCents}¢</AppText>}
                      </View>
                      {r.notes && r.notes.length > 0 && <NoteRows notes={r.notes} />}
                      {r.overlay && (
                        <PremiumGate
                          feature="performance-overlay"
                          source="performance-overlay"
                          fallback={(openPaywall) => <LockedOverlay onPress={openPaywall} />}
                        >
                          <MelodyOverlay target={r.overlay.target} sung={r.overlay.sung} />
                        </PremiumGate>
                      )}
                      <Button title="Hear the answer" variant="ghost" onPress={() => session.replayAnswer(i)} />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <Button title={actions.primary.title} onPress={actions.primary.onPress} />
        <Button title={actions.secondary.title} variant="ghost" onPress={actions.secondary.onPress} />
      </View>
    </>
  );
}
