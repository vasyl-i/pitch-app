import { StyleSheet, View } from 'react-native';
import {
  cuesStartingNote,
  LiveReadout,
  MicGlow,
  PianoKeyboard,
  PracticeCanvas,
  speedLevelsFor,
  useHapticMetronome,
  useSpeedStore,
  useStaffSession,
  useStaffStore,
} from '@/features/staff-practice';
import { AppText, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { StageTransition } from '../StageTransition';
import { useRunRecording } from './useRunRecording';
import { useStagePrompt } from './useStagePrompt';
import { useRunActions } from './useRunActions';
import { useRunContext } from './useRunContext';
import type { StaffSessionProps } from './types';
import { SessionHeader } from './SessionHeader';
import { TempoControls } from './TempoControls';
import { NoInputOverlay, Overlay, RoundSummaryOverlay } from './RunOverlays';


/** one run of one key: preview, sing-along, solo, and its result */
export function StaffSession(p: StaffSessionProps) {
  const { t } = useTranslation();
  const { keyLabel, headerLine, roundLabel } = useRunContext(p);
  const { restart, skipListen, partialSummary } = useStaffSession(p.exercise, p.rate, { singAlongOnly: p.whole });
  // felt, not heard: an audible click would reach the mic (see useHapticMetronome)
  useHapticMetronome(useSpeedStore((s) => s.metronome), p.exercise.bpm, p.rate);

  const status = useStaffStore((s) => s.status);
  const errorMessage = useStaffStore((s) => s.errorMessage);
  const lastRound = p.round >= p.rounds - 1;
  const { summary } = useRunRecording({
    exercise: p.exercise,
    rate: p.rate,
    loop: p.loop,
    lastRound,
    restart,
    onRoundRecorded: p.onRoundRecorded,
    partialSummary: p.whole ? partialSummary : undefined,
  });
  const prompt = useStagePrompt(keyLabel, p.keyChange, p.loop);
  const actions = useRunActions({ navigation: p.navigation, guided: p.guided, lastRound, restart, nextRound: p.onRoundDone });

  const canvasRunning = status === 'running' || status === 'listen' || status === 'accompanied';
  const showOverlay = status === 'error' || status === 'no-input' || status === 'transition' || !!summary;
  const previewing = status === 'listen';
  const midis = p.exercise.notes.map((n) => n.midi);

  return (
    <Screen overlay={status === 'accompanied' || status === 'running' ? <MicGlow /> : undefined}>
      {!summary && <SessionHeader title={p.exercise.title} context={headerLine} bpm={p.exercise.bpm} rate={p.rate} onBack={p.navigation.goBack} />}

      {/* Canvas stays mounted across all stages so the Skia clock and layout
          are always warm — remounting causes a layout + offset-init delay that
          desyncs audio from the playhead. Overlay cards cover it when needed. */}
      <View style={[styles.stage, !canvasRunning && styles.hidden]} pointerEvents={showOverlay ? 'none' : 'auto'}>
        <View style={[styles.readout, showOverlay && styles.hidden]}>
          <LiveReadout showHz={p.showHz} />
        </View>
        <View style={[styles.prompt, showOverlay && styles.hidden]}>
          <AppText variant="label" center>
            {prompt.title}
          </AppText>
          <AppText variant="caption" center>
            {prompt.subtitle}
          </AppText>
        </View>
        <View style={styles.canvas}>
          <PracticeCanvas
            targets={p.exercise.notes}
            rate={p.rate}
            bpm={p.exercise.bpm}
            running={canvasRunning}
            showNoteLabels
            fitMidi={p.ladderSpan}
            // a whole song is far too long to fit across: show a stretch of it and scroll
            windowSec={p.whole ? WHOLE_SONG_WINDOW_SEC : undefined}
          />
        </View>

        {!showOverlay && (
          <>
            <TempoControls
              visible={previewing}
              bpm={p.exercise.bpm}
              levels={speedLevelsFor(p.exercise.notes)}
              rate={p.rate}
              onRate={p.setRate}
              premium={p.premium}
              onLocked={p.onLockedSpeed}
              direction={p.direction}
              onDirection={p.setDirection}
            />
            <PianoKeyboard lowMidi={p.ladderSpan?.low ?? Math.min(...midis)} highMidi={p.ladderSpan?.high ?? Math.max(...midis)} />
            <Button title={t('staff.restart')} variant="ghost" onPress={restart} style={styles.restart} />
            {/* always laid out, only shown during the preview, so the canvas above never resizes */}
            <Button
              title={t('staff.skipPreview')}
              variant="transparent"
              onPress={skipListen}
              disabled={!previewing}
              pointerEvents={previewing ? 'auto' : 'none'}
              style={[styles.skip, !previewing && styles.hidden]}
            />
          </>
        )}
      </View>

      {status === 'error' && (
        <Overlay>
          <AppText variant="body" color={palette.danger} center>
            {errorMessage}
          </AppText>
        </Overlay>
      )}
      {status === 'no-input' && <NoInputOverlay onRetry={restart} exits={actions.noInputExits} />}
      {status === 'transition' && (
        <Overlay>
          <StageTransition startingNote={cuesStartingNote(p.exercise)} />
        </Overlay>
      )}
      {summary && <RoundSummaryOverlay summary={summary} roundLabel={roundLabel} {...actions.summary} />}
    </Screen>
  );
}

/** phrase seconds of a whole song on screen at once */
const WHOLE_SONG_WINDOW_SEC = 10;

const styles = StyleSheet.create({
  stage: { flex: 1 },
  hidden: { opacity: 0 },
  readout: { marginTop: spacing.md },
  // fixed height so the staff below doesn't shift as the copy changes
  prompt: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  canvas: { flex: 1, marginVertical: spacing.md },
  restart: { marginTop: spacing.md },
  skip: { marginTop: spacing.sm },
});
