import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { ConfidenceMeter, ScrollingPitchCanvas, usePitchTrail, useStabilizedNote } from '@/features/pitch-visualization';
import { midiToName } from '@/shared/lib/music';
import { LOW_CONFIDENCE_THRESHOLD, useGuidedRangeDetection, type RangeDirection } from '../lib/guidedDetection';

export interface DetectionResult {
  midi: number;
  confidence: number;
}

const TITLE: Record<RangeDirection, string> = {
  low: 'Find your lowest note',
  high: 'Find your highest note',
};
const INSTRUCTION: Record<RangeDirection, string> = {
  low: 'Start from a comfortable note and slowly slide lower until you reach your lowest comfortable note.',
  high: 'Slowly slide upward until you reach the highest comfortable note, without straining.',
};

/**
 * The body of one detection phase (low or high) — live note, staff, hold
 * progress, confidence, and the capture/retry/continue controls. Both
 * onboarding and the settings "run detection again" flow render this same
 * component; only the thin screen wrappers around it differ in what they do
 * with a captured result.
 */
export function DetectionFlow({
  direction,
  onCaptured,
  onBack,
}: {
  direction: RangeDirection;
  onCaptured: (result: DetectionResult) => void;
  onBack: () => void;
}) {
  const { palette, spacing, radii, gradient } = useTheme();
  const {
    status,
    errorMessage,
    currentMidi,
    currentFrequency,
    liveConfidence,
    holdProgress,
    bestMidi,
    bestConfidence,
    message,
    start,
    stop,
    retry,
  } = useGuidedRangeDetection(direction);

  const shownNote = useStabilizedNote(currentMidi);
  const { trail, now, push, reset: resetTrail } = usePitchTrail();

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // feed live pitch into the trail buffer
  useEffect(() => {
    push(currentMidi);
  }, [currentMidi, push]);

  const confidenceColor = liveConfidence >= 0.35 ? palette.accent : palette.textFaint;
  const lowConfidence = bestMidi !== null && bestConfidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <View style={{ flex: 1 }}>
      <AppText variant="title" style={{ fontSize: 24 }}>
        {TITLE[direction]}
      </AppText>
      <AppText variant="body" style={{ marginTop: spacing.sm }}>
        {INSTRUCTION[direction]}
      </AppText>

      {status === 'error' ? (
        <View style={styles.center}>
          <AppText variant="body" color={palette.danger} style={{ textAlign: 'center' }}>
            {errorMessage}
          </AppText>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title="Try again" onPress={start} />
          </View>
        </View>
      ) : (
        <>
          <Card style={{ ...styles.card, marginTop: spacing.lg }}>
            <AppText variant="title" color={shownNote !== null ? confidenceColor : palette.textFaint} style={styles.noteName}>
              {shownNote === null ? ' ' : midiToName(shownNote)}
            </AppText>
            <View style={styles.canvasWrap}>
              <ScrollingPitchCanvas
                trail={trail}
                liveMidi={currentMidi}
                liveCents={null}
                targetMidi={null}
                currentTime={now}
                trailColor={confidenceColor}
              />
            </View>
            <AppText variant="caption" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              {currentFrequency !== null ? `${Math.round(currentFrequency)} Hz` : ' '}
            </AppText>
          </Card>

          <View style={{ marginTop: spacing.sm }}>
            <ConfidenceMeter confidence={liveConfidence} />
          </View>
          <View style={[styles.holdTrack, { backgroundColor: palette.borderSubtle, borderRadius: radii.pill, marginTop: spacing.sm }]}>
            <View style={[styles.holdFill, { width: `${Math.round(holdProgress * 100)}%`, borderRadius: radii.pill, overflow: 'hidden' }]}>
              <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </View>
          </View>

          <AppText variant="body" color={palette.textSecondary} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
            {message}
          </AppText>

          <View style={styles.spacer} />

          {bestMidi !== null && (
            <Card style={styles.bestRow}>
              <AppText variant="caption">Captured</AppText>
              <AppText variant="label" style={{ fontSize: 20, marginTop: 2 }}>
                {midiToName(bestMidi)}
              </AppText>
              {lowConfidence && (
                <AppText variant="caption" color={palette.warning} style={{ marginTop: 4, textAlign: 'center' }}>
                  That reading isn’t very confident — consider trying again.
                </AppText>
              )}
            </Card>
          )}

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            {bestMidi !== null ? (
              <>
                <Button title="Continue" onPress={() => onCaptured({ midi: bestMidi, confidence: bestConfidence })} />
                <Button title="Try again" variant="ghost" onPress={() => { retry(); resetTrail(); }} />
              </>
            ) : (
              <Button title="Back" variant="ghost" onPress={onBack} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 20 },
  canvasWrap: { height: 160, marginBottom: 8 },
  noteName: { fontSize: 28, textAlign: 'center', fontVariant: ['tabular-nums'], marginBottom: 8 },
  holdTrack: { height: 6, overflow: 'hidden' },
  holdFill: { height: '100%' },
  spacer: { flex: 1 },
  bestRow: { padding: 14, alignItems: 'center' },
});
