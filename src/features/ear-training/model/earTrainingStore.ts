/**
 * UI-facing state for the ear-training session. Written only by the session
 * engine; screens subscribe with selectors. Kept flat and serializable so the
 * screen layer stays dumb.
 */
import { create } from 'zustand';
import type { NoteOutcome, RoundScore, SessionSummary } from '../lib/evaluators';
import type { EarPhase, ExerciseId } from './types';

export interface LiveFeedback {
  /** note being sung right now, e.g. "A3" */
  note: string | null;
  /** the real, continuously-evaluated round score so far */
  score: RoundScore | null;
  /** per-note progress for multi-note exercises (which chord tones are in) */
  outcomes: NoteOutcome[] | null;
}

const IDLE_LIVE: LiveFeedback = { note: null, score: null, outcomes: null };

interface EarTrainingState {
  phase: EarPhase;
  exerciseId: ExerciseId | null;
  difficultyId: string | null;
  round: number;
  totalRounds: number;
  /** headline instruction for the current round */
  instruction: string;
  /** 3-2-1 value during the countdown phase */
  countdown: number | null;
  /** seconds left on the pitch-memory retention timer */
  waitSecondsLeft: number | null;
  /** choice buttons for listening exercises */
  choices: { id: string; label: string }[] | null;
  live: LiveFeedback;
  roundResult: RoundScore | null;
  results: RoundScore[];
  summary: SessionSummary | null;
  /** friendly banner on the picker (mic denied, interruption, audio failure) */
  notice: string | null;

  set: (partial: Partial<EarTrainingState>) => void;
  reset: () => void;
}

const initial = {
  phase: 'idle' as EarPhase,
  exerciseId: null,
  difficultyId: null,
  round: 0,
  totalRounds: 0,
  instruction: '',
  countdown: null,
  waitSecondsLeft: null,
  choices: null,
  live: IDLE_LIVE,
  roundResult: null,
  results: [] as RoundScore[],
  summary: null,
  notice: null,
};

export const useEarTrainingStore = create<EarTrainingState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  reset: () => set(initial),
}));
