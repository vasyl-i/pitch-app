import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  categoryRepeats,
  exercises,
  fitToRange,
  keyLadder,
  keyRoom,
  nextSweepKey,
  odeToJoy,
  randomKey,
  transposeExercise,
  type KeyDirection,
} from '@/entities/exercise';
import { useProfileStore } from '@/entities/profile';
import { buildSessionRecord, elapsedPracticeSeconds, useProgressStore } from '@/features/progress';
import {
  cuesStartingNote,
  DirectionChips,
  directionFor,
  LiveReadout,
  MetronomeButton,
  metronomeSupported,
  MicGlow,
  PianoKeyboard,
  PracticeCanvas,
  speedBpm,
  SpeedChips,
  speedFor,
  useHapticMetronome,
  useSpeedStore,
  useStaffSession,
  useStaffStore,
  VERDICT_LABEL,
  type ScaleDirection,
  type SpeedLevel,
} from '@/features/staff-practice';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { formatKeyName, useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { useLessonSessionStore } from '@/features/learning';
import { isPremium, usePaywall, usePremiumStatus, useSubscriptionStore } from '@/features/subscription';
import { activeStepLabel, advanceAfterStep } from '../session/lessonFlow';
import { PhraseSummaryCard } from './PhraseSummaryCard';
import { StageTransition } from './StageTransition';

/** pause between one finished run and the next in loop practice */
const NEXT_RUN_DELAY_MS = 600;

export function StaffPracticeScreen({ navigation, route }: RootScreenProps<'MelodyPractice'>) {
  const { t } = useTranslation();
  const original = exercises.find((e) => e.id === route.params.exerciseId) ?? odeToJoy;
  const guided = route.params.guided === true;
  // the speed picked for this exercise in the library, for preview and singing alike
  const [rate, setRate] = useState<SpeedLevel>(() =>
    speedFor(original.id, isPremium(useSubscriptionStore.getState().subscription)),
  );
  const premium = usePremiumStatus().isPremium;
  const openPaywall = usePaywall('melody-practice');
  // a speed picked here is remembered for the exercise, as in the library, and
  // the run restarts from the preview at the new tempo
  const changeRate = useCallback((level: SpeedLevel) => {
    useSpeedStore.getState().setSpeed(original.id, level);
    setRate(level);
  }, [original.id]);
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
  // Practised on its own (from the library), a scale or arpeggio runs round
  // after round until the singer leaves, each round in a new key within the
  // range: a scale sweeps a semitone at a time to one end of the voice and
  // back, starting from the end its direction setting picks; an arpeggio
  // hops to a random key.
  const pattern = guided ? undefined : original.pattern;
  const [room] = useState(() =>
    pattern ? keyRoom(original, useProfileStore.getState().autoTranspose ? range : null) : null,
  );
  const [endless, setEndless] = useState<{ shift: number; direction: KeyDirection } | null>(() => {
    if (!room) return null;
    if (pattern === 'arpeggio') return { shift: randomKey(room, null), direction: 1 };
    const up = directionFor(original.id) === 'up';
    return { shift: up ? room.lowest : room.highest, direction: up ? 1 : -1 };
  });

  // A guided climb left mid-way resumes at the first unsung key: the ladder
  // is deterministic for the day's plan, so the same keys come back. The slot
  // is snapshotted so a round finishing after the step changed can't land on
  // another step's progress.
  const [slot] = useState(() => useLessonSessionStore.getState().activeSlot);
  const [resumeRound] = useState(() => {
    if (!ladder || !slot) return 0;
    const done = useLessonSessionStore.getState().partialProgress[slot]?.completedRounds ?? 0;
    return Math.min(done, ladder.length - 1);
  });
  // a scale from the library sweeps the keys; flipping it applies from the next key on
  const [direction, setDirectionState] = useState<ScaleDirection>(() => directionFor(original.id));
  const changeDirection = useCallback((next: ScaleDirection) => {
    useSpeedStore.getState().setDirection(original.id, next);
    setDirectionState(next);
    setEndless((cur) => (cur ? { ...cur, direction: next === 'up' ? 1 : -1 } : cur));
  }, [original.id]);

  const [round, setRound] = useState(resumeRound);
  const [previousShift, setPreviousShift] = useState<number | null>(
    ladder && resumeRound > 0 ? ladder[resumeRound - 1] : null,
  );
  const rounds = endless ? Infinity : (ladder?.length ?? 1);
  const roundShift = endless ? endless.shift : ladder ? ladder[round] : autoTranspose ? shift : 0;

  const nextRound = useCallback(() => {
    setPreviousShift(roundShift);
    setRound((r) => Math.min(r + 1, rounds - 1));
    if (room) {
      setEndless((cur) => {
        if (!cur) return cur;
        return pattern === 'arpeggio'
          ? { shift: randomKey(room, cur.shift), direction: 1 }
          : nextSweepKey(cur.shift, cur.direction, room);
      });
    }
  }, [roundShift, rounds, room, pattern]);

  // a guided round before the last was sung: remember it, so leaving now
  // still shows it on Home's progress circle and re-entry picks up after it
  const saveRoundDone = useCallback(() => {
    if (!ladder || !slot) return;
    useLessonSessionStore.getState().savePartial(slot, {
      completedRounds: round + 1,
      results: [],
      lastAnswerPc: undefined,
      savedAt: Date.now(),
    });
  }, [ladder, slot, round]);

  // how this round's key relates to the last, for the preview prompt
  const keyChange =
    previousShift === null || previousShift === roundShift
      ? null
      : roundShift - previousShift === 1
        ? t('staff.keyChange.higher')
        : roundShift - previousShift === -1
          ? t('staff.keyChange.lower')
          : t('staff.keyChange.newKey');

  // every key the rounds can visit on one fixed pitch axis, so each new key
  // visibly sits above or below the last
  const ladderSpan = useMemo(() => {
    const midis = original.notes.map((n) => n.midi);
    if (room) return { low: Math.min(...midis) + room.lowest, high: Math.max(...midis) + room.highest };
    if (!ladder) return undefined;
    return { low: Math.min(...midis) + ladder[0], high: Math.max(...midis) + ladder[ladder.length - 1] };
  }, [original, ladder, room]);
  const exercise = useMemo(() => transposeExercise(original, roundShift), [original, roundShift]);

  return (
    <StaffSession
      // the round too: a range with room for one key repeats it, and each
      // round still needs a fresh run
      // not the rate: a new speed restarts the run in place (see useStaffSession)
      key={`${exercise.id}-${roundShift}-${round}`}
      navigation={navigation}
      guided={guided}
      endless={endless !== null}
      keyChange={keyChange}
      round={round}
      rounds={rounds}
      onRoundDone={nextRound}
      onRoundRecorded={saveRoundDone}
      ladderSpan={ladderSpan}
      exercise={exercise}
      rate={rate}
      setRate={changeRate}
      premium={premium}
      onLockedSpeed={openPaywall}
      direction={endless && pattern === 'scale' ? direction : null}
      setDirection={changeDirection}
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
  endless,
  keyChange,
  round,
  rounds,
  onRoundDone,
  onRoundRecorded,
  ladderSpan,
  exercise,
  rate,
  setRate,
  premium,
  onLockedSpeed,
  direction,
  setDirection,
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
  /** rounds continue until the singer leaves (a scale or arpeggio from the library) */
  endless: boolean;
  /** how this round's key moved from the last one, e.g. "A semitone lower" */
  keyChange: string | null;
  /** this session's round of the step (0-based) and how many the step has */
  round: number;
  rounds: number;
  /** a round before the last has been sung: move on to the next key */
  onRoundDone: () => void;
  /** that round was recorded, before the pause that leads into the next key */
  onRoundRecorded: () => void;
  /** the whole climb's pitch span, for a display that holds still across keys */
  ladderSpan: { low: number; high: number } | undefined;
  exercise: typeof odeToJoy;
  rate: SpeedLevel;
  /** pick a new speed: remembered, and the run restarts at it */
  setRate: (r: SpeedLevel) => void;
  premium: boolean;
  /** a free user tapped a Premium speed */
  onLockedSpeed: () => void;
  /** the key sweep's direction, null when this run doesn't sweep (not a library scale) */
  direction: ScaleDirection | null;
  setDirection: (d: ScaleDirection) => void;
  loop: boolean;
  setLoop: (v: boolean) => void;
  showHz: boolean;
  setShowHz: (v: boolean) => void;
  shift: number;
  canTranspose: boolean;
  autoTranspose: boolean;
  setAutoTranspose: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
  const keyLabel = formatKeyName(exercise.key);
  const { restart, skipListen } = useStaffSession(exercise, rate);
  // felt, not heard: an audible click would reach the mic (see useHapticMetronome)
  const metronome = useSpeedStore((s) => s.metronome);
  useHapticMetronome(metronome, exercise.bpm, rate);

  const status = useStaffStore((s) => s.status);
  const errorMessage = useStaffStore((s) => s.errorMessage);
  const summary = useStaffStore((s) => s.summary);
  const comparison = useStaffStore((s) => s.comparison);
  const outputIsolated = useStaffStore((s) => s.outputIsolated);
  const lastVerdict = useStaffStore((s) => s.lastVerdict);

  // the live pitch, trail and playhead are read inside PracticeCanvas, so
  // their ~30 Hz updates re-render the canvas, not this whole screen
  const canvasRunning = status === 'running' || status === 'listen' || status === 'accompanied';

  const lowMidi = ladderSpan?.low ?? Math.min(...exercise.notes.map((n) => n.midi));
  const highMidi = ladderSpan?.high ?? Math.max(...exercise.notes.map((n) => n.midi));

  // a run starts at its listen stage; its recorded practice time covers the
  // whole run (listening, transitions, singing), not just the sung phrase
  const runStartedAtRef = useRef(Date.now());
  useEffect(() => {
    if (status === 'listen') runStartedAtRef.current = Date.now();
  }, [status]);

  // every round ends on its results; before the last, the singer moves on to
  // the next key from there (or sings this one again)
  const lastRound = round >= rounds - 1;

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
      // remembered now, not on "Next round": leaving from the results keeps it
      if (!lastRound && !loop) onRoundRecorded();
    }
  }, [status, summary, exercise, addSession, rate, lastRound, loop, onRoundRecorded]);

  // loop practice: on finish, go again straight away instead of the summary
  useEffect(() => {
    if (loop && status === 'finished') {
      const id = setTimeout(() => restart(), NEXT_RUN_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, [loop, status, restart]);

  const showSummary = status === 'finished' && summary && summary !== staleSummary && !loop;
  const roundLabel =
    rounds <= 1
      ? undefined
      : endless
        ? t('session.results.round', { number: round + 1 })
        : t('session.round.counter', { round: round + 1, total: rounds });
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
      return keyChange
        ? { promptTitle: t('staff.prompt.nowIn', { key: keyLabel }), promptSubtitle: t('staff.prompt.listenFirst', { change: keyChange }) }
        : { promptTitle: t('staff.prompt.listen'), promptSubtitle: t('staff.prompt.follow') };
    }
    if (status === 'accompanied') {
      return {
        promptTitle: t('staff.prompt.accompanied'),
        promptSubtitle: lastVerdict
          ? VERDICT_LABEL[lastVerdict.verdict]
          : outputIsolated
            ? t('staff.prompt.match')
            : t('staff.prompt.matchHeadphones'),
      };
    }
    return {
      promptTitle: t('staff.prompt.yourTurn'),
      promptSubtitle: lastVerdict
        ? VERDICT_LABEL[lastVerdict.verdict]
        : loop
          ? t('staff.prompt.looping')
          : t('staff.prompt.solo'),
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
                    ? `${activeStepLabel() ?? t('staff.header.todaysPractice')}${rounds > 1 ? ` · ${keyLabel} · ${t('session.round.counter', { round: round + 1, total: rounds })}` : ''}`
                    : endless
                      ? `${keyLabel} · ${t('session.results.round', { number: round + 1 })}`
                    : shift !== 0
                        ? `${keyLabel} · ${t('staff.header.forRange', { shift: `${shift > 0 ? '+' : ''}${shift}` })}`
                        : exercise.source}
                {rate !== 1 ? ` · ${t('exercises.bpm', { bpm: speedBpm(exercise.bpm, rate) })}` : ''}
              </AppText>
            </View>
            {metronomeSupported() && (
              <MetronomeButton on={metronome} onToggle={() => useSpeedStore.getState().setMetronome(!metronome)} />
            )}
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
          <PracticeCanvas
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
            {/* tempo (and a library scale's direction) while the preview plays;
                always laid out, only shown then, so the canvas never resizes */}
            <View
              style={{ marginBottom: spacing.sm, opacity: status === 'listen' ? 1 : 0 }}
              pointerEvents={status === 'listen' ? 'auto' : 'none'}
            >
              {/* the unit once, so the chips can be bare numbers and the row fits a narrow phone */}
              <AppText variant="caption" style={{ fontSize: 12, lineHeight: 16, marginBottom: 4 }}>
                {t('exercises.speedCaption')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <SpeedChips
                  bpm={exercise.bpm}
                  value={rate}
                  premium={premium}
                  onChange={(level) => level !== rate && setRate(level)}
                  onLocked={onLockedSpeed}
                  compact
                  style={{ flexWrap: 'nowrap' }}
                />
                {direction && (
                  <DirectionChips value={direction} onChange={setDirection} compact style={{ flexWrap: 'nowrap', marginLeft: spacing.md }} />
                )}
              </ScrollView>
            </View>
            <PianoKeyboard lowMidi={lowMidi} highMidi={highMidi} />
            <Button title={t('staff.restart')} variant="ghost" onPress={() => restart()} style={{ marginTop: spacing.md }} />
            {/* always laid out, only shown during the preview, so the canvas
                above never resizes between stages */}
            <Button
              title={t('staff.skipPreview')}
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
            {t('staff.noInputTitle')}
          </AppText>
          <AppText variant="caption" color={palette.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
            {t('staff.noInputBody')}
          </AppText>
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Button title={t('common.tryAgain')} onPress={() => restart()} />
            {guided ? (
              <>
                <Button title={t('session.ear.skipStep')} variant="ghost" onPress={() => advanceAfterStep(navigation)} />
                <Button title={t('session.ear.backHome')} variant="ghost" onPress={() => { useLessonSessionStore.getState().completeActive(); resetToTab(navigation, 'HomeTab'); }} />
              </>
            ) : (
              <Button title={t('common.done')} variant="ghost" onPress={() => navigation.goBack()} />
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
          {lastRound ? (
            <PhraseSummaryCard
              summary={summary}
              comparison={comparison}
              roundLabel={roundLabel}
              primary={
                guided
                  ? { title: t('session.ear.continue'), onPress: () => advanceAfterStep(navigation) }
                  : { title: t('staff.singAgain'), onPress: () => restart() }
              }
              secondary={
                guided
                  ? { title: t('staff.singItAgain'), onPress: () => restart() }
                  : { title: t('common.done'), onPress: () => navigation.goBack() }
              }
              tertiary={
                guided
                  ? { title: t('session.ear.backHome'), onPress: () => resetToTab(navigation, 'HomeTab') }
                  : undefined
              }
            />
          ) : (
            // between rounds: on to the next key, this key again, or out
            <PhraseSummaryCard
              summary={summary}
              comparison={comparison}
              roundLabel={roundLabel}
              primary={{ title: t('staff.nextRound'), onPress: onRoundDone }}
              secondary={{ title: t('staff.singItAgain'), onPress: () => restart() }}
              tertiary={
                guided
                  ? { title: t('session.ear.backHome'), onPress: () => resetToTab(navigation, 'HomeTab') }
                  : { title: t('common.done'), onPress: () => navigation.goBack() }
              }
            />
          )}
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
