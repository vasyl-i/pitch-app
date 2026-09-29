import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Button } from '@/shared/ui';
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
  const { palette, spacing, radii, gradient, typography } = useTheme();
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
      <AppText
        variant="title"
        style={{ fontSize: 28, fontFamily: typography.family.bold, textAlign: "center" }}
      >
        {TITLE[direction]}
      </AppText>
      <AppText variant="body" color={palette.textSecondary} style={{ marginTop: spacing.sm, lineHeight: 22 , textAlign: "center"}}>
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

            <View style={styles.capturedBlock}>
              <AppText variant="caption" color={palette.textFaint}>Captured</AppText>
              <AppText
                variant="title"
                style={{ fontSize: 40, fontFamily: typography.family.bold, marginTop: 2 }}
              >
                {bestMidi !== null ? midiToName(bestMidi) : " "}
              </AppText>
            </View>

          <View style={[styles.canvasWrap, { marginTop: bestMidi !== null ? spacing.md : spacing.xl }]}>
            <ScrollingPitchCanvas
              trail={trail}
              liveMidi={currentMidi}
              liveCents={null}
              targetMidi={null}
              currentTime={now}
              trailColor={confidenceColor}
            />
          </View>

          <View style={{ marginTop: spacing.xxl * 2 }}>
            <ConfidenceMeter confidence={liveConfidence} />
          </View>
          <View style={[styles.holdTrack, { backgroundColor: palette.borderSubtle, borderRadius: radii.pill, marginTop: spacing.sm }]}>
            <View style={[styles.holdFill, { width: `${Math.round(holdProgress * 100)}%`, borderRadius: radii.pill, overflow: 'hidden' }]}>
              <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </View>
          </View>

          {lowConfidence && (
            <AppText variant="caption" color={palette.warning} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              That reading isn't very confident — consider trying again.
            </AppText>
          )}

          <View style={styles.spacer} />

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            {bestMidi !== null ? (
              <>
                <Button
                  title="Try again"
                  variant="ghost"
                  onPress={() => { retry(); resetTrail(); }}
                />
                <Button
                  title="Continue"
                  onPress={() => onCaptured({ midi: bestMidi, confidence: bestConfidence })}
                  style={{ backgroundColor: '#ffffff' }}
                />
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
  capturedBlock: { alignItems: 'center', marginTop: 24 },
  canvasWrap: { height: 180 },
  holdTrack: { height: 6, overflow: 'hidden' },
  holdFill: { height: '100%' },
  spacer: { flex: 1 },
});
