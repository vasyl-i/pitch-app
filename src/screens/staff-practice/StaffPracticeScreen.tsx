import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { categoryRepeats, exercises, fitToRange, keyLadder, odeToJoy, transposeExercise } from '@/entities/exercise';
import { useProfileStore } from '@/entities/profile';
import { buildSessionRecord, elapsedPracticeSeconds, useProgressStore } from '@/features/progress';
import {
  cuesStartingNote,
  LiveReadout,
  MicGlow,
  PianoKeyboard,
  useStaffSession,
  useStaffStore,
  VERDICT_LABEL,
} from '@/features/staff-practice';
import { StaticPitchCanvas } from '@/features/pitch-visualization';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { useLessonSessionStore } from '@/features/learning';
import { activeStepLabel, advanceAfterStep } from '../session/lessonFlow';
import { PhraseSummaryCard } from './PhraseSummaryCard';
import { StageTransition } from './StageTransition';

/** pause between one finished run and the next (loop, or the next key) */
const NEXT_RUN_DELAY_MS = 600;

export function StaffPracticeScreen({ navigation, route }: RootScreenProps<'MelodyPractice'>) {
  const original = exercises.find((e) => e.id === route.params.exerciseId) ?? odeToJoy;
  const guided = route.params.guided === true;
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [showHz, setShowHz] = useState(false);

  // fit the melody to the singer's measured range (toggleable). The range is
  // snapshotted for this screen's lifetime: singing well feeds range
  // learning, and if the transpose shift tracked the live profile, a mid-run
  // range update would change the session key and remount — killing the run
  // the singer is in the middle of. Fresh range applies on the next visit.
  const [range] = useState(() => useProfileStore.getState().profile?.trainingRange ?? null);
  const autoTranspose = useProfileStore((s) => s.autoTranspose);
  const setAutoTranspose = useProfileStore((s) => s.setAutoTranspose);
  const { shift } = useMemo(() => fitToRange(original, range), [original, range]);

  // A guided step runs as many rounds as today's plan fitted to the time
  // budget. A song runs once (listen, then sing it alone); a scale or arpeggio
  // climbs a semitone per round through the singer's range, keeping its own
  // tonality — each round is a new key, so a new session.
  const [ladder] = useState<number[] | null>(() => {
    if (!guided || categoryRepeats(original.category) === 'once') return null;
    const { steps, activeSlot } = useLessonSessionStore.getState();
    const rounds = steps.find((s) => s.slot === activeSlot)?.totalRounds ?? 1;
    if (rounds <= 1) return null;
    return keyLadder(original, useProfileStore.getState().autoTranspose ? range : null, rounds);
  });
  const [round, setRound] = useState(0);
  const rounds = ladder?.length ?? 1;
  const nextRound = useCallback(() => setRound((r) => Math.min(r + 1, rounds - 1)), [rounds]);

  const roundShift = ladder ? ladder[round] : autoTranspose ? shift : 0;
  // every key of the climb on one fixed pitch axis, so each round visibly
  // sits a semitone above the last
  const ladderSpan = useMemo(() => {
    if (!ladder) return undefined;
    const midis = original.notes.map((n) => n.midi);
    return { low: Math.min(...midis) + ladder[0], high: Math.max(...midis) + ladder[ladder.length - 1] };
  }, [original, ladder]);
  const exercise = useMemo(() => transposeExercise(original, roundShift), [original, roundShift]);

  return (
    <StaffSession
      key={`${exercise.id}-${rate}-${roundShift}`}
      navigation={navigation}
      guided={guided}
      round={round}
      rounds={rounds}
      onRoundDone={nextRound}
      ladderSpan={ladderSpan}
      exercise={exercise}
      rate={rate}
      setRate={setRate}
      loop={loop}
      setLoop={setLoop}
      showHz={showHz}
      setShowHz={setShowHz}
      shift={roundShift}
      canTranspose={shift !== 0 && range !== null}
      autoTranspose={autoTranspose}
      setAutoTranspose={setAutoTranspose}
    />
  );
}

function StaffSession({
  navigation,
  guided,
  round,
  rounds,
  onRoundDone,
  ladderSpan,
  exercise,
  rate,
  setRate,
  loop,
  setLoop,
  showHz,
  setShowHz,
  shift,
  canTranspose,
  autoTranspose,
  setAutoTranspose,
}: {
  navigation: RootScreenProps<'MelodyPractice'>['navigation'];
  guided: boolean;
  /** this session's round of the step (0-based) and how many the step has */
  round: number;
  rounds: number;
  /** a round before the last has been sung: move on to the next key */
  onRoundDone: () => void;
  /** the whole climb's pitch span, for a display that holds still across keys */
  ladderSpan: { low: number; high: number } | undefined;
  exercise: typeof odeToJoy;
  rate: number;
  setRate: (r: number) => void;
  loop: boolean;
  setLoop: (v: boolean) => void;
  showHz: boolean;
  setShowHz: (v: boolean) => void;
  shift: number;
  canTranspose: boolean;
  autoTranspose: boolean;
  setAutoTranspose: (v: boolean) => void;
}) {
  const { palette, spacing } = useTheme();
  const { restart, skipListen } = useStaffSession(exercise, rate);

  const status = useStaffStore((s) => s.status);
  const errorMessage = useStaffStore((s) => s.errorMessage);
  const summary = useStaffStore((s) => s.summary);
  const comparison = useStaffStore((s) => s.comparison);
  const outputIsolated = useStaffStore((s) => s.outputIsolated);
  const lastVerdict = useStaffStore((s) => s.lastVerdict);

  // canvas data
  const trail = useStaffStore((s) => s.trail);
  const liveMidi = useStaffStore((s) => s.liveMidi);
  const liveCents = useStaffStore((s) => s.liveCents);
  const position = useStaffStore((s) => s.position);
  const canvasRunning = status === 'running' || status === 'listen' || status === 'accompanied';

  const lowMidi = ladderSpan?.low ?? Math.min(...exercise.notes.map((n) => n.midi));
  const highMidi = ladderSpan?.high ?? Math.max(...exercise.notes.map((n) => n.midi));

  // a run starts at its listen stage; its recorded practice time covers the
  // whole run (listening, transitions, singing), not just the sung phrase
  const runStartedAtRef = useRef(Date.now());
  useEffect(() => {
    if (status === 'listen') runStartedAtRef.current = Date.now();
  }, [status]);

  // the summary waits for the step's last round; earlier rounds hand over to
  // the next key once recorded (a manual restart redoes the current round)
  const lastRound = round >= rounds - 1;
  const nextRoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (nextRoundTimer.current) clearTimeout(nextRoundTimer.current);
  }, []);

  // persist every completed phrase exactly once (loops record each pass)
  const addSession = useProgressStore((s) => s.addSession);
  // Seeded with whatever summary the shared store still holds at mount: a
  // session remounted for the next round's key first renders the previous
  // round's 'finished' state (the store reset runs in an effect after that
  // render), and must neither record it again nor advance another round.
  const [staleSummary] = useState(() => useStaffStore.getState().summary);
  const recordedRef = useRef<unknown>(staleSummary);
  useEffect(() => {
    if (status === 'finished' && summary && recordedRef.current !== summary) {
      recordedRef.current = summary;
      const at = Date.now();
      addSession(buildSessionRecord(exercise, summary, at, rate, elapsedPracticeSeconds(runStartedAtRef.current, at)));
      if (!lastRound && !loop) nextRoundTimer.current = setTimeout(onRoundDone, NEXT_RUN_DELAY_MS);
    }
  }, [status, summary, exercise, addSession, rate, lastRound, loop, onRoundDone]);

  // loop practice: on finish, go again straight away instead of the summary
  useEffect(() => {
    if (loop && status === 'finished') {
      const id = setTimeout(() => restart(), NEXT_RUN_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, [loop, status, restart]);

  const showSummary = status === 'finished' && summary && summary !== staleSummary && !loop && lastRound;
  const showOverlay = status === 'error' || status === 'no-input' || status === 'transition' || showSummary;

  // What the singer should be doing right now, as a title/subtitle pair above
  // the staff. Each stage names itself, so it is never ambiguous whether the
  // app is demonstrating, singing along, or testing — and in the two graded
  // stages the subtitle gives way to live per-note feedback.
  //
  // On the built-in speaker the mic also hears the accompaniment, which
  // inflates this stage's score. The guide still plays — the subtitle just
  // points at the one-second fix.
  const { promptTitle, promptSubtitle } = ((): { promptTitle: string; promptSubtitle: string } => {
    if (status === 'listen') {
      return round > 0
        ? { promptTitle: `Now in ${exercise.key}`, promptSubtitle: 'A semitone higher — listen first' }
        : { promptTitle: 'Listen to the example', promptSubtitle: 'Follow the notes' };
    }
    if (status === 'accompanied') {
      return {
        promptTitle: 'Sing with the accompaniment',
        promptSubtitle: lastVerdict
          ? VERDICT_LABEL[lastVerdict.verdict]
          : outputIsolated
            ? 'Match each note as closely as possible'
            : 'Match each note — headphones give a truer score',
      };
    }
    return {
      promptTitle: 'Your turn',
      promptSubtitle: lastVerdict
        ? VERDICT_LABEL[lastVerdict.verdict]
        : loop
          ? 'Looping — sing it again'
          : 'Sing without the guide',
    };
  })();

  return (
    <Screen overlay={status === 'accompanied' || status === 'running' ? <MicGlow /> : undefined}>
      {
        !showSummary &&
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{exercise.title}</AppText>
              <AppText variant="caption">
                {guided
                    ? `${activeStepLabel() ?? "Today's practice"}${rounds > 1 ? ` · ${exercise.key} · Round ${round + 1} of ${rounds}` : ''}`
                    : shift !== 0
                        ? `${exercise.key} · ${shift > 0 ? '+' : ''}${shift} for your range`
                        : exercise.source}
              </AppText>
            </View>
          </View>
      }

      {/* Canvas stays mounted across all stages so the Skia clock and layout
          are always warm — remounting causes a layout + offset-init delay that
          desyncs audio from the playhead. Overlay cards cover it when needed. */}
      <View style={{ flex: 1, opacity: canvasRunning ? 1 : 0 }} pointerEvents={showOverlay ? 'none' : 'auto'}>
        <View style={{ marginTop: spacing.md, opacity: showOverlay ? 0 : 1 }}>
          <LiveReadout showHz={showHz} />
        </View>

        <View style={[styles.promptBlock, { marginTop: spacing.lg, opacity: showOverlay ? 0 : 1 }]}>
          <AppText variant="label" style={styles.promptText}>
            {promptTitle}
          </AppText>
          <AppText variant="caption" style={styles.promptText}>
            {promptSubtitle}
          </AppText>
        </View>

        <View style={{ flex: 1, marginVertical: spacing.md }}>
          <StaticPitchCanvas
            trail={trail}
            liveMidi={liveMidi}
            liveCents={liveCents}
            currentTime={position}
            targets={exercise.notes}
            rate={rate}
            bpm={exercise.bpm}
            running={canvasRunning}
            showNoteLabels
            fitMidi={ladderSpan}
          />
        </View>

        {!showOverlay && (
          <>
            <PianoKeyboard lowMidi={lowMidi} highMidi={highMidi} />
            <Button title="Restart" variant="ghost" onPress={() => restart()} style={{ marginTop: spacing.md }} />
            {/* always laid out, only shown during the preview, so the canvas
                above never resizes between stages */}
            <Button
              title="Skip preview"
              variant="transparent"
              onPress={() => skipListen()}
              disabled={status !== 'listen'}
              pointerEvents={status === 'listen' ? 'auto' : 'none'}
              style={{ marginTop: spacing.sm, opacity: status === 'listen' ? 1 : 0 }}
            />
          </>
        )}
      </View>

      {/* Overlay cards — rendered on top of the always-mounted canvas */}
      {status === 'error' && (
        <View style={styles.overlay}>
          <AppText variant="body" color={palette.danger} style={{ textAlign: 'center' }}>
            {errorMessage}
          </AppText>
        </View>
      )}
      {status === 'no-input' && (
        <View style={styles.overlay}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            We didn't hear any singing.
          </AppText>
          <AppText variant="caption" color={palette.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
            Check your mic, then give it a try — you'll hear the melody first, then sing it on your own.
          </AppText>
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Button title="Try again" onPress={() => restart()} />
            {guided ? (
              <>
                <Button title="Skip this step" variant="ghost" onPress={() => advanceAfterStep(navigation)} />
                <Button title="Back to home" variant="ghost" onPress={() => { useLessonSessionStore.getState().completeActive(); resetToTab(navigation, 'HomeTab'); }} />
              </>
            ) : (
              <Button title="Done" variant="ghost" onPress={() => navigation.goBack()} />
            )}
          </View>
        </View>
      )}
      {status === 'transition' && (
        <View style={styles.overlay}>
          <StageTransition startingNote={cuesStartingNote(exercise)} />
        </View>
      )}
      {showSummary && (
        <View style={styles.overlay}>
          <PhraseSummaryCard
            summary={summary}
            comparison={comparison}
            primary={
              guided
                ? { title: 'Continue practice', onPress: () => advanceAfterStep(navigation) }
                : { title: 'Sing again', onPress: () => restart() }
            }
            secondary={
              guided
                ? { title: 'Sing it again', onPress: () => restart() }
                : { title: 'Done', onPress: () => navigation.goBack() }
            }
            tertiary={
              guided
                ? { title: 'Back to home', onPress: () => resetToTab(navigation, 'HomeTab') }
                : undefined
            }
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, justifyContent: 'center' },
  overlay: { ...(StyleSheet.absoluteFill as object), flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  // fixed height so the staff below doesn't shift as the copy changes
  promptBlock: { height: 44, alignItems: 'center', justifyContent: 'center' },
  promptText: { textAlign: 'center' },
});
