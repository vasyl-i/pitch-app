import { useCallback, useMemo, useState } from 'react';
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
import { directionFor, speedFor, useSpeedStore, type ScaleDirection, type SpeedLevel } from '@/features/staff-practice';
import { useLessonSessionStore } from '@/features/learning';
import { isPremium, useSubscriptionStore } from '@/features/subscription';
import { useTranslation } from '@/shared/i18n';

/**
 * Which key each round is sung in, and how the rounds advance.
 *
 * - A guided step runs as many rounds as today's plan fitted. A song runs
 *   once; a scale or arpeggio climbs a semitone per round through the range
 *   (the `ladder`), resuming at the first unsung key if left mid-way.
 * - Practised on its own, a scale or arpeggio runs until the singer leaves
 *   (`endless`): a scale sweeps a semitone at a time to one end of the voice
 *   and back, from the end its direction setting picks; an arpeggio hops to
 *   a random key.
 * - Otherwise the melody is fitted to the singer's range, if they want that.
 *
 * The range is snapshotted for the screen's lifetime: singing well feeds
 * range learning, and a mid-run range update must not change the key and
 * remount the run the singer is in the middle of.
 */
export function usePracticeRounds(exerciseId: string, guided: boolean) {
  const { t } = useTranslation();
  const original = exercises.find((e) => e.id === exerciseId) ?? odeToJoy;
  const [range] = useState(() => useProfileStore.getState().profile?.trainingRange ?? null);
  const autoTranspose = useProfileStore((s) => s.autoTranspose);
  const { shift } = useMemo(() => fitToRange(original, range), [original, range]);
  const fitted = () => (useProfileStore.getState().autoTranspose ? range : null);

  // the speed picked for this exercise, remembered as in the library
  const [rate, setRateState] = useState<SpeedLevel>(() => speedFor(original.id, isPremium(useSubscriptionStore.getState().subscription)));
  const setRate = useCallback((level: SpeedLevel) => {
    useSpeedStore.getState().setSpeed(original.id, level);
    setRateState(level);
  }, [original.id]);

  const [ladder] = useState<number[] | null>(() => {
    if (!guided || categoryRepeats(original.category) === 'once') return null;
    const { steps, activeSlot } = useLessonSessionStore.getState();
    const count = steps.find((s) => s.slot === activeSlot)?.totalRounds ?? 1;
    return count > 1 ? keyLadder(original, fitted(), count) : null;
  });
  const pattern = guided ? undefined : original.pattern;
  const [room] = useState(() => (pattern ? keyRoom(original, fitted()) : null));
  const [endless, setEndless] = useState<{ shift: number; direction: KeyDirection } | null>(() => {
    if (!room) return null;
    if (pattern === 'arpeggio') return { shift: randomKey(room, null), direction: 1 };
    const up = directionFor(original.id) === 'up';
    return { shift: up ? room.lowest : room.highest, direction: up ? 1 : -1 };
  });

  // snapshotted so a round finishing after the step changed can't land on another step's progress
  const [slot] = useState(() => useLessonSessionStore.getState().activeSlot);
  const [resumeRound] = useState(() => {
    if (!ladder || !slot) return 0;
    return Math.min(useLessonSessionStore.getState().partialProgress[slot]?.completedRounds ?? 0, ladder.length - 1);
  });

  // a library scale's sweep direction; a flip applies from the next key on
  const [direction, setDirectionState] = useState<ScaleDirection>(() => directionFor(original.id));
  const setDirection = useCallback((next: ScaleDirection) => {
    useSpeedStore.getState().setDirection(original.id, next);
    setDirectionState(next);
    setEndless((cur) => (cur ? { ...cur, direction: next === 'up' ? 1 : -1 } : cur));
  }, [original.id]);

  const [round, setRound] = useState(resumeRound);
  const [previousShift, setPreviousShift] = useState<number | null>(ladder && resumeRound > 0 ? ladder[resumeRound - 1] : null);
  const rounds = endless ? Infinity : (ladder?.length ?? 1);
  const roundShift = endless ? endless.shift : ladder ? ladder[round] : autoTranspose ? shift : 0;

  const nextRound = useCallback(() => {
    setPreviousShift(roundShift);
    setRound((r) => Math.min(r + 1, rounds - 1));
    if (room) setEndless((cur) => (!cur ? cur : pattern === 'arpeggio' ? { shift: randomKey(room, cur.shift), direction: 1 } : nextSweepKey(cur.shift, cur.direction, room)));
  }, [roundShift, rounds, room, pattern]);

  // a guided round before the last was sung: remember it, so leaving now
  // still shows it on Home's progress circle and re-entry picks up after it
  const saveRoundDone = useCallback(() => {
    if (!ladder || !slot) return;
    useLessonSessionStore.getState().savePartial(slot, { completedRounds: round + 1, results: [], lastAnswerPc: undefined, savedAt: Date.now() });
  }, [ladder, slot, round]);

  // how this round's key relates to the last, for the preview prompt
  const step = previousShift === null ? 0 : roundShift - previousShift;
  const keyChange = step === 0 ? null : step === 1 ? t('staff.keyChange.higher') : step === -1 ? t('staff.keyChange.lower') : t('staff.keyChange.newKey');

  // every key the rounds can visit on one fixed pitch axis, so each new key visibly sits above or below the last
  const ladderSpan = useMemo(() => {
    const midis = original.notes.map((n) => n.midi);
    if (room) return { low: Math.min(...midis) + room.lowest, high: Math.max(...midis) + room.highest };
    if (!ladder) return undefined;
    return { low: Math.min(...midis) + ladder[0], high: Math.max(...midis) + ladder[ladder.length - 1] };
  }, [original, ladder, room]);
  const exercise = useMemo(() => transposeExercise(original, roundShift), [original, roundShift]);

  return {
    exercise,
    roundShift,
    round,
    rounds,
    endless: endless !== null,
    keyChange,
    ladderSpan,
    nextRound,
    saveRoundDone,
    rate,
    setRate,
    direction: endless && pattern === 'scale' ? direction : null,
    setDirection,
    canTranspose: shift !== 0 && range !== null,
  };
}
