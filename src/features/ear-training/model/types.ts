/**
 * The contract every ear-training exercise implements.
 *
 * An exercise is data, not a screen: `makeRound` returns what to play, what to
 * ask, and how to judge the response. The session engine drives every
 * exercise through the same lifecycle —
 *
 *   idle → preparing → playing → (waiting) → (countdown) → listening
 *        → evaluating → round-result → … → completed
 *
 * — so adding an exercise means writing one definition object and zero
 * lifecycle code.
 */
import type { SungFrame } from '../lib/capture';
import type { RoundScore } from '../lib/evaluators';
import type { PromptScript } from '../lib/promptPlayer';

export type EarPhase =
  | 'idle'
  | 'preparing'
  | 'playing'
  /** retention delay before singing (pitch memory) */
  | 'waiting'
  | 'countdown'
  /** mic window open, or choice buttons armed */
  | 'listening'
  | 'evaluating'
  | 'round-result'
  | 'completed';

export type ExerciseId =
  | 'note-echo'
  | 'chord-tones'
  | 'major-minor'
  | 'pitch-memory'
  | 'melody-echo'
  | 'odd-one-out'
  | 'finish-melody'
  | 'sing-interval'
  | 'echo-interval';

export interface RoundContext {
  /** one of the definition's difficulty ids, or null when it has none */
  difficulty: string | null;
  /** comfortable playback register (the singer's measured range when known) */
  range: { low: number; high: number };
  /** previous round's answer pitch class, so rounds don't repeat */
  previousPc?: number;
}

/** The user answers by singing into an open mic window. */
export interface SingResponse {
  kind: 'sing';
  windowMs: number;
  /** silent retention delay before the countdown (pitch memory), seconds */
  holdSec?: number;
  /** 3-2-1 length, seconds; 0 = sing immediately (echo-style exercises) */
  countdownSec: number;
  /**
   * The ONE scorer for this round. The engine runs it repeatedly over the
   * growing frame log for the live readout and once at window close for the
   * result — same function, so live and final can never disagree.
   */
  evaluate(frames: SungFrame[]): RoundScore;
}

/** The user answers by tapping one of a few buttons. */
export interface ChoiceResponse {
  kind: 'choice';
  options: { id: string; label: string }[];
  evaluate(chosenId: string): RoundScore;
}

export interface EarRound {
  prompt: PromptScript;
  /** played by "hear the answer" on results; defaults to `prompt` */
  answerPrompt?: PromptScript;
  /** headline instruction while answering, e.g. "Sing a major third above" */
  instruction: string;
  /** this round's answer pitch class, carried to the next round's context */
  answerPc: number;
  response: SingResponse | ChoiceResponse;
}

export interface ExerciseDefinition {
  id: ExerciseId;
  title: string;
  /** card body on the picker */
  tagline: string;
  needsMic: boolean;
  rounds: number;
  /** null when the exercise has a single form */
  difficulties: { id: string; label: string }[] | null;
  defaultDifficulty?: string;
  /** how long the round verdict stays up; multi-note results need longer */
  resultMs?: number;
  makeRound(ctx: RoundContext): EarRound;
}
