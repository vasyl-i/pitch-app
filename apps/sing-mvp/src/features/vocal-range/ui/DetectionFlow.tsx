import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { ConfidenceMeter, MiniStaff, useStabilizedNote } from '@/features/pitch-visualization';
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

  // Presentation only: holds the displayed note through small excursions across
  // a note boundary so the readout stops flickering. `currentMidi` is the raw
  // detector pitch and is passed to MiniStaff unchanged.
  const shownNote = useStabilizedNote(currentMidi);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <AppText variant="display" style={styles.noteName}>
              {shownNote === null ? '—' : midiToName(shownNote)}
            </AppText>
            <MiniStaff liveMidi={currentMidi} color={liveConfidence >= 0.35 ? palette.accent : palette.textFaint} />
            <View style={{ marginTop: spacing.sm }}>
              <ConfidenceMeter confidence={liveConfidence} />
            </View>
            <View style={[styles.holdTrack, { backgroundColor: palette.borderSubtle, borderRadius: radii.pill, marginTop: spacing.md }]}>
              <View style={[styles.holdFill, { width: `${Math.round(holdProgress * 100)}%`, borderRadius: radii.pill, overflow: 'hidden' }]}>
                <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </View>
            </View>
            <AppText variant="caption" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              {currentFrequency !== null ? `${Math.round(currentFrequency)} Hz` : ' '}
            </AppText>
          </Card>

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
                <Button title="Try again" variant="ghost" onPress={retry} />
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
  noteName: { fontSize: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  holdTrack: { height: 6, overflow: 'hidden' },
  holdFill: { height: '100%' },
  spacer: { flex: 1 },
  bestRow: { padding: 14, alignItems: 'center' },
});
