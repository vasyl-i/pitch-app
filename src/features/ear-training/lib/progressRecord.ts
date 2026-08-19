/**
 * Adapter from a finished ear-training session to the progress feature's
 * mode-agnostic attempt record — the "way in" that progress/lib/record.ts
 * was generalized to provide.
 *
 * Which rounds feed the per-pitch-class tendency heatmap:
 *
 * - Sung target notes graded within CLOSE_CENTS carry real tendency data:
 *   the singer aimed at that pitch and we know how far off they landed.
 *   Beyond CLOSE_CENTS the app itself says "we heard <another note>" — the
 *   singer most likely went for a different note entirely, so attributing
 *   the deviation to the intended target would poison the heatmap. (Melody
 *   practice keeps its 'wrong' notes because its targets are time-aligned
 *   on a staff; here the target existed only in the user's head.)
 * - Choice rounds (major/minor, odd one out) involve no singing: they
 *   contribute score, stars and streaks, but no tendency data. Their
 *   `answerPc` is a variety seed — odd-one-out stores a slot index there —
 *   and must never reach the tallies.
 *
 * `perfect` uses PERFECT_CENTS to match the melody grader's 'perfect'
 * verdict, so heatmap accuracy means the same thing whichever mode fed it.
 */
import { buildAttemptRecord, type GradedNote, type SessionRecord } from '@/features/progress';
import { PERFECT_CENTS } from '@/shared/lib/music';
import type { EarRound, ExerciseDefinition } from '../model/types';
import { CLOSE_CENTS, type RoundScore, type SessionSummary } from './evaluators';

/**
 * Whether a round's graded notes carry real MIDI pitches (and so may feed
 * register/interval tracking), or only pitch classes.
 *
 * Multi-note rounds report per-note outcomes with true `midi` values in sung
 * order. Single-target rounds attribute the deviation to `round.answerPc` — a
 * pitch *class*, with no octave — so they must never reach a per-MIDI tally.
 */
export function roundIsMelodic(round: EarRound, result: RoundScore): boolean {
  return round.response.kind === 'sing' && result.notes !== undefined;
}

/** Tendency-bearing notes from one round, per the rules above. */
export function gradedNotesForRound(round: EarRound, result: RoundScore): GradedNote[] {
  if (round.response.kind !== 'sing') return [];

  // multi-note rounds (chord tones, melody echo) report per-note outcomes;
  // rows without a graded target ('extra', 'missing') carry no cents/midi
  if (result.notes) {
    return result.notes.flatMap((n) =>
      n.midi !== undefined && n.cents !== null && Math.abs(n.cents) <= CLOSE_CENTS
        ? [{ midi: n.midi, medianCents: n.cents, perfect: Math.abs(n.cents) <= PERFECT_CENTS }]
        : []
    );
  }

  // single-target rounds (echo, memory, interval, finish melody): the
  // round-level signed deviation, attributed to the round's answer pitch class
  if (result.signedCents === null || Math.abs(result.signedCents) > CLOSE_CENTS) return [];
  return [
    {
      midi: round.answerPc,
      medianCents: result.signedCents,
      perfect: Math.abs(result.signedCents) <= PERFECT_CENTS,
    },
  ];
}

/** Assemble the persistable record for a completed ear-training session. */
export function buildEarSessionRecord(
  def: ExerciseDefinition,
  difficultyId: string | null,
  rounds: EarRound[],
  results: RoundScore[],
  summary: SessionSummary,
  at = Date.now()
): SessionRecord {
  const graded = results.flatMap((result, i) => {
    const round = rounds[i];
    return round ? gradedNotesForRound(round, result) : [];
  });

  // each melodic round is its own sequence — rounds are separate phrases, so
  // the last note of one and the first of the next form no interval
  const melodicSequences = results.flatMap((result, i) => {
    const round = rounds[i];
    if (!round || !roundIsMelodic(round, result)) return [];
    const notes = gradedNotesForRound(round, result);
    return notes.length > 0 ? [notes] : [];
  });
  // time spent actually singing: the open mic windows (choice-only sessions omit it)
  const singSeconds = rounds.reduce(
    (sec, r) => sec + (r.response.kind === 'sing' ? r.response.windowMs / 1000 : 0),
    0
  );
  const difficultyLabel = def.difficulties?.find((d) => d.id === difficultyId)?.label;

  return buildAttemptRecord(
    // 'ear:' keeps these ids out of the melody exercises' bestScores namespace
    { id: `ear:${def.id}`, title: difficultyLabel ? `${def.title} · ${difficultyLabel}` : def.title },
    {
      score: summary.overall,
      // the record requires a number; 0 stands in when nothing was sung
      avgCents: summary.avgCents ?? 0,
      // no separate steadiness/rhythm measurements here — intonation quality
      // and the round average are the closest honest stand-ins
      stability: summary.pitchAccuracy ?? summary.overall,
      rhythm: summary.rhythmAccuracy ?? summary.overall,
      durationSec: singSeconds > 0 ? Math.round(singSeconds) : undefined,
    },
    graded,
    at,
    { melodicSequences }
  );
}
