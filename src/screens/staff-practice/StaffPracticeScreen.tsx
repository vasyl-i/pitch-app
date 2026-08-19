import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { exercises, fitToRange, odeToJoy, transposeExercise } from '@/entities/exercise';
import { useProfileStore } from '@/entities/profile';
import { buildSessionRecord, useProgressStore } from '@/features/progress';
import { LiveReadout, PianoKeyboard, StaffView, useStaffSession, useStaffStore, VERDICT_LABEL } from '@/features/staff-practice';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';
import { activeStepLabel, advanceAfterStep } from '../session/lessonFlow';
import { PhraseSummaryCard } from './PhraseSummaryCard';
import { StageTransition } from './StageTransition';

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
  const active = autoTranspose && shift !== 0;
  const exercise = useMemo(() => (active ? transposeExercise(original, shift) : original), [original, active, shift]);

  return (
    <StaffSession
      key={`${exercise.id}-${rate}-${active ? shift : 0}`}
      navigation={navigation}
      guided={guided}
      exercise={exercise}
      rate={rate}
      setRate={setRate}
      loop={loop}
      setLoop={setLoop}
      showHz={showHz}
      setShowHz={setShowHz}
      shift={active ? shift : 0}
      canTranspose={shift !== 0 && range !== null}
      autoTranspose={autoTranspose}
      setAutoTranspose={setAutoTranspose}
    />
  );
}

function StaffSession({
  navigation,
  guided,
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
  const { restart } = useStaffSession(exercise, rate);

  const status = useStaffStore((s) => s.status);
  const errorMessage = useStaffStore((s) => s.errorMessage);
  const summary = useStaffStore((s) => s.summary);
  const comparison = useStaffStore((s) => s.comparison);
  const outputIsolated = useStaffStore((s) => s.outputIsolated);
  const lastVerdict = useStaffStore((s) => s.lastVerdict);

  const lowMidi = Math.min(...exercise.notes.map((n) => n.midi));
  const highMidi = Math.max(...exercise.notes.map((n) => n.midi));

  // persist every completed phrase exactly once (loops record each pass)
  const addSession = useProgressStore((s) => s.addSession);
  const recordedRef = useRef<unknown>(null);
  useEffect(() => {
    if (status === 'finished' && summary && recordedRef.current !== summary) {
      recordedRef.current = summary;
      addSession(buildSessionRecord(exercise, summary, Date.now(), rate));
    }
  }, [status, summary, exercise, addSession, rate]);

  // loop practice: on finish, restart immediately instead of showing summary
  useEffect(() => {
    if (loop && status === 'finished') {
      const id = setTimeout(() => restart(), 600);
      return () => clearTimeout(id);
    }
  }, [loop, status, restart]);

  const showSummary = status === 'finished' && summary && !loop;

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
      return { promptTitle: 'Listen to the example', promptSubtitle: 'Follow the notes' };
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
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">{exercise.title}</AppText>
          <AppText variant="caption">
            {guided
              ? (activeStepLabel() ?? 'Today’s practice')
              : shift !== 0
                ? `${exercise.key} · ${shift > 0 ? '+' : ''}${shift} for your range`
                : exercise.source}
          </AppText>
        </View>
      </View>

      {status === 'error' ? (
        <View style={styles.center}>
          <AppText variant="body" color={palette.danger} style={{ textAlign: 'center' }}>
            {errorMessage}
          </AppText>
        </View>
      ) : status === 'no-input' ? (
        // a silent run ends here rather than in a summary — there is no
        // performance to score, so nothing is graded and nothing is recorded
        <View style={styles.center}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            We didn’t hear any singing.
          </AppText>
          <AppText variant="caption" color={palette.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
            Check your mic, then give it a try — you’ll hear the melody, sing it with the guide, then on your own.
          </AppText>
          <View style={{ marginTop: spacing.lg }}>
            <Button title="Try again" onPress={() => restart()} />
            {guided ? (
              <Button title="Skip this step" variant="ghost" onPress={() => advanceAfterStep(navigation)} />
            ) : (
              <Button title="Done" variant="ghost" onPress={() => navigation.goBack()} />
            )}
          </View>
        </View>
      ) : status === 'transition' ? (
        // a beat of praise between the assisted and unaided attempts. No
        // interaction: the run continues on its own timer.
        <StageTransition />
      ) : showSummary ? (
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
        />
      ) : (
        <>
          <View style={{ marginTop: spacing.md }}>
            <LiveReadout showHz={showHz} />
          </View>

          <View style={[styles.promptBlock, { marginTop: spacing.lg }]}>
            <AppText variant="label" style={styles.promptText}>
              {promptTitle}
            </AppText>
            <AppText variant="caption" style={styles.promptText}>
              {promptSubtitle}
            </AppText>
          </View>

          <View style={{ flex: 1, marginVertical: spacing.md }}>
            <StaffView exercise={exercise} rate={rate} />
          </View>

          <PianoKeyboard lowMidi={lowMidi} highMidi={highMidi} />

          <Button title="Restart" variant="ghost" onPress={() => restart()} style={{ marginTop: spacing.md }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, justifyContent: 'center' },
  // fixed height so the staff below doesn't shift as the copy changes
  promptBlock: { height: 44, alignItems: 'center', justifyContent: 'center' },
  promptText: { textAlign: 'center' },
});
