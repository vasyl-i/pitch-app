import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { translatedRecord, useTranslation } from '@/shared/i18n';
import { ConfidenceMeter, ScrollingPitchCanvas, usePitchTrail } from '@/features/pitch-visualization';
import { midiToName } from '@/shared/lib/music';
import { LOW_CONFIDENCE_THRESHOLD, useGuidedRangeDetection, type RangeDirection } from '../lib/guidedDetection';

export interface DetectionResult {
  midi: number;
  confidence: number;
}

const TITLE = translatedRecord<RangeDirection>({
  low: 'vocalRange.detect.titleLow',
  high: 'vocalRange.detect.titleHigh',
});
const INSTRUCTION = translatedRecord<RangeDirection>({
  low: 'vocalRange.detect.instructionLow',
  high: 'vocalRange.detect.instructionHigh',
});

/**
 * The body of one detection phase (low or high) — live note, staff, hold
 * progress, confidence, and the capture/retry/continue controls. Both
 * onboarding and the settings "run detection again" flow render this same
 * component; only the thin screen wrappers around it differ in what they do
 * with a captured result.
 */
export function DetectionFlow({ direction, onCaptured, onBack }: {
  direction: RangeDirection;
  onCaptured: (result: DetectionResult) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const detection = useGuidedRangeDetection(direction);
  const { status, errorMessage, currentMidi, currentFrequency, liveConfidence, bestMidi, bestConfidence, start, stop, retry } =
    detection;
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

  return (
    <View style={styles.fill}>
      <AppText variant="headline" center gradient style={styles.title}>
        {TITLE[direction]}
      </AppText>
      <AppText variant="label" center gradient style={styles.instruction}>
        {INSTRUCTION[direction]}
      </AppText>

      {status === 'error' ? (
        <View style={styles.center}>
          <AppText variant="body" color={palette.danger} center>
            {errorMessage}
          </AppText>
          <Button variant="transparent" title={t('common.tryAgain')} onPress={start} style={styles.retry} />
        </View>
      ) : (
        <>
          <CapturedNote midi={bestMidi} />

          <View style={[styles.canvas, bestMidi !== null ? styles.canvasAfterCapture : styles.canvasBeforeCapture]}>
            <ScrollingPitchCanvas
              trail={trail}
              liveMidi={currentMidi}
              currentTime={now}
              trailColor={liveConfidence >= 0.35 ? palette.accent : palette.textFaint}
              liveFrequency={currentFrequency}
            />
          </View>

          <View style={styles.meter}>
            <ConfidenceMeter confidence={liveConfidence} />
          </View>

          {bestMidi !== null && bestConfidence < LOW_CONFIDENCE_THRESHOLD && (
            <AppText variant="caption" color={palette.warning} center style={styles.lowConfidence}>
              {t('vocalRange.detect.lowConfidence')}
            </AppText>
          )}

          <View style={styles.fill} />

          <View style={styles.actions}>
            {bestMidi !== null ? (
              <>
                <Button
                  title={t('common.tryAgain')}
                  variant="transparent"
                  onPress={() => {
                    retry();
                    resetTrail();
                  }}
                />
                <Button title={t('common.continue')} onPress={() => onCaptured({ midi: bestMidi, confidence: bestConfidence })} />
              </>
            ) : (
              <Button title={t('common.back')} variant="ghost" onPress={onBack} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

/** the best note held so far, or a blank of the same height before there is one */
function CapturedNote({ midi }: { midi: number | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.captured}>
      <AppText variant="caption">{midi !== null ? t('vocalRange.detect.captured') : ' '}</AppText>
      <AppText variant="score" color={palette.accent} style={styles.capturedNote}>
        {midi !== null ? midiToName(midi) : ' '}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { paddingTop: 10 },
  instruction: { marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: spacing.lg, alignSelf: 'stretch' },
  captured: { alignItems: 'center', marginTop: 48, marginBottom: spacing.lg },
  capturedNote: { marginTop: 2 },
  canvas: { height: 180 },
  canvasAfterCapture: { marginTop: spacing.md },
  canvasBeforeCapture: { marginTop: spacing.xl },
  meter: { marginTop: spacing.xxl * 2 },
  lowConfidence: { marginTop: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.md },
});
