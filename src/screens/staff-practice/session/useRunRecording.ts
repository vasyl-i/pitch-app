import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@/entities/exercise';
import { buildSessionRecord, elapsedPracticeSeconds, useProgressStore } from '@/features/progress';
import { useStaffStore, type SpeedLevel } from '@/features/staff-practice';

/** pause between one finished run and the next in loop practice */
const NEXT_RUN_DELAY_MS = 600;

/**
 * Records each finished run exactly once — with the whole run's practice
 * time, listening and transitions included — and decides whether its summary
 * shows (loop practice goes again instead).
 */
export function useRunRecording({ exercise, rate, loop, lastRound, restart, onRoundRecorded }: {
  exercise: Exercise;
  rate: SpeedLevel;
  loop: boolean;
  lastRound: boolean;
  restart: () => void;
  onRoundRecorded: () => void;
}) {
  const status = useStaffStore((s) => s.status);
  const summary = useStaffStore((s) => s.summary);
  const addSession = useProgressStore((s) => s.addSession);

  // a run starts at its listen stage
  const runStartedAtRef = useRef(Date.now());
  useEffect(() => {
    if (status === 'listen') runStartedAtRef.current = Date.now();
  }, [status]);

  // Seeded with whatever summary the shared store still holds at mount: a
  // session remounted for the next round's key first renders the previous
  // round's 'finished' state (the store reset runs in an effect after that
  // render), and must neither record it again nor advance another round.
  const [staleSummary] = useState(() => useStaffStore.getState().summary);
  const recordedRef = useRef<unknown>(staleSummary);
  useEffect(() => {
    if (status !== 'finished' || !summary || recordedRef.current === summary) return;
    recordedRef.current = summary;
    const at = Date.now();
    addSession(buildSessionRecord(exercise, summary, at, rate, elapsedPracticeSeconds(runStartedAtRef.current, at)));
    // remembered now, not on "Next round": leaving from the results keeps it
    if (!lastRound && !loop) onRoundRecorded();
  }, [status, summary, exercise, addSession, rate, lastRound, loop, onRoundRecorded]);

  // loop practice: on finish, go again straight away instead of the summary
  useEffect(() => {
    if (!loop || status !== 'finished') return;
    const id = setTimeout(restart, NEXT_RUN_DELAY_MS);
    return () => clearTimeout(id);
  }, [loop, status, restart]);

  return { summary: status === 'finished' && summary && summary !== staleSummary && !loop ? summary : null };
}
