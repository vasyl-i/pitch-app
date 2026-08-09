/**
 * Comparing the assisted attempt against the unaided one.
 *
 * A three-stage run produces two scored passes of the *same* phrase: one sung
 * over the guide, one from memory. The gap between them is the actual learning
 * signal — but it is a signal that reads as failure by default, because almost
 * everyone scores lower without the guide. So the framing is fixed here, next
 * to the numbers, rather than left to each screen: a drop is what learning
 * looks like partway through, and the copy has to say so.
 *
 * Pure — no scoring logic of its own. It reads two `PhraseSummary` values the
 * existing evaluator produced and decides how to talk about them.
 */
import type { PhraseSummary } from './evaluation';

export type AttemptTrend = 'improved' | 'held' | 'slipped';

export interface AttemptComparison {
  /** score of the pass sung over the guide, 0..100 */
  accompaniedScore: number;
  /** score of the pass sung from memory, 0..100 */
  soloScore: number;
  /** solo − accompanied, signed; negative means the guide was helping */
  delta: number;
  trend: AttemptTrend;
  /** encouraging, honest headline for the comparison block */
  message: string;
}

/**
 * Below this many points, a drop is noise — voice warmth, one late entry, a
 * single note clipped by the phrase end. Treating it as a regression would
 * punish singers who are, in fact, ready.
 */
const HELD_MARGIN = 8;

export function compareAttempts(accompanied: PhraseSummary, solo: PhraseSummary): AttemptComparison {
  const delta = solo.score - accompanied.score;
  const trend: AttemptTrend = delta >= 0 ? 'improved' : delta >= -HELD_MARGIN ? 'held' : 'slipped';

  return {
    accompaniedScore: accompanied.score,
    soloScore: solo.score,
    delta,
    trend,
    message:
      trend === 'improved'
        ? 'Excellent! You sang even better without the guide.'
        : trend === 'held'
          ? 'Great job! You’re almost ready to sing it independently.'
          : 'Nice work! Practice with the accompaniment a few more times.',
  };
}
