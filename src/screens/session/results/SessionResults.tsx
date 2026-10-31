/**
 * The one results screen every exercise ends on: the score on the mascot's
 * board, round-by-round breakdown, and the host screen's action buttons.
 */
import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { exerciseById, useEarTrainingStore } from '@/features/ear-training';
import { palette, spacing } from '@/shared/theme';
import { AppText, Button, ScoreBoard, useBottomInset } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';
import { RoundBreakdown } from './RoundBreakdown';

interface SessionControls {
  retry(): void;
  replayAnswer(roundIndex?: number): void;
}

/** the footer buttons — the host screen decides where the session leads next */
export interface ResultsActions {
  primary: { title: string; onPress: () => void };
  secondary: { title: string; onPress: () => void };
  tertiary?: { title: string; onPress: () => void };
}

export function SessionResults({ session, actions }: { session: SessionControls; actions: ResultsActions }) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const blurTargetRef = useRef<View>(null);
  const exerciseId = useEarTrainingStore((s) => s.exerciseId);
  const results = useEarTrainingStore((s) => s.results);
  const summary = useEarTrainingStore((s) => s.summary);
  if (!summary) return null;

  return (
    <View style={styles.fill}>
      <BlurTargetView ref={blurTargetRef} collapsable={false} style={styles.fill}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <ScoreBoard success={false}>
              <AppText variant="score" weight="medium" color={summary.overall >= 70 ? palette.accent : palette.textPrimary}>
                {summary.overall}%
              </AppText>
              {summary.avgCents !== null && (
                <AppText variant="caption" color={palette.textSecondaryElevated}>
                  {t('session.results.avgOff', { cents: summary.avgCents })}
                </AppText>
              )}
            </ScoreBoard>
            <AppText variant="caption" color={palette.white} style={styles.nailed}>
              {t('session.results.nailed', { correct: summary.correctRounds, count: summary.totalRounds })}
            </AppText>
          </View>
          <RoundBreakdown title={exerciseId ? (exerciseById(exerciseId)?.title ?? '') : ''} rounds={results} onReplay={(i) => session.replayAnswer(i)} />
        </ScrollView>
      </BlurTargetView>

      <BlurView intensity={10} tint="dark" blurTarget={blurTargetRef} blurMethod="dimezisBlurViewSdk31Plus" style={[styles.footer, { paddingBottom: bottomInset }]}>
        <Button title={actions.primary.title} onPress={actions.primary.onPress} />
        <Button title={actions.secondary.title} variant="ghost" onPress={actions.secondary.onPress} />
        {actions.tertiary && <Button title={actions.tertiary.title} variant="transparent" onPress={actions.tertiary.onPress} />}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { height: '100%' },
  content: { paddingBottom: 300, paddingHorizontal: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.lg },
  nailed: { marginTop: spacing.md },
  footer: { gap: 20, paddingTop: spacing.md, position: 'absolute', width: '100%', bottom: 0, paddingHorizontal: spacing.lg },
});
