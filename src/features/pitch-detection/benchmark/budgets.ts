/**
 * Budgets: the numbers the shipping configuration is held to.
 *
 * Every value here was produced by running this harness against the current
 * implementation and then adding headroom. None of them is a target anyone
 * chose. That direction matters — a budget derived from measurement fails when
 * behaviour *changes*, which is the thing worth knowing; a budget derived from
 * ambition fails on the day it is written and gets commented out by the end of
 * the week.
 *
 * Consequently these are not quality goals, and improving the detector should
 * *break* them. When it does, re-run with `--update-baseline`, read the diff,
 * and tighten the numbers deliberately.
 *
 * Two entries encode known failures as minimums rather than maximums
 * (`minOctaveErrorRate`). Pinning a defect is not endorsing it: above the
 * declared ceiling the detector reports exactly one octave low, several parts
 * of the app depend on that band being refused rather than trusted, and a
 * silent fix would leave `MAX_RELIABLE_F0` lying about the engine.
 */
import type { BandMetrics, BenchmarkReport, BudgetViolation, DetectorBudget } from './types';

/**
 * Measured on 2026-08-01 against the shipping pipeline. Each limit is the
 * observed value rounded up to roughly 2–4x, which is wide enough that the
 * corpus's own quantization noise passes and narrow enough that a real change
 * in behaviour does not. The measured values themselves are in
 * `baselines/yin-11k-w512.json`; these are the alarms, that is the record.
 */
export const SHIPPING_BUDGET: DetectorBudget = {
  configId: 'yin-11k-w512',
  basis: 'measured 2026-08-01 against the shipping pipeline, rounded up for headroom',
  maxFalsePitchRate: 0.001, // measured 0
  maxRealTimeFactor: 0.5, // measured 0.0056 — a very loose guard on complexity regressions only
  maxMedianSettlingMs: 80, // measured 41.2
  bands: [
    {
      /**
       * Below MIN_RELIABLE_F0. The median stays exact because only the bottom
       * note of the band (55Hz) is degraded — which is the whole reason p95
       * is budgeted here and not just the median. The budget says "still this
       * bad and no worse", making the declared floor a measured boundary
       * rather than a preference.
       */
      bandId: 'sub-low',
      maxMedianAbsCents: 2, // measured 0.21
      maxP95AbsCents: 20, // measured 12.61
      maxOctaveErrorRate: 0.001, // measured 0
      maxLostVoiceRate: 0.01, // measured 0
    },
    {
      bandId: 'low',
      maxMedianAbsCents: 1.5, // measured 0.13
      maxP95AbsCents: 8, // measured 5.31
      maxOctaveErrorRate: 0.001, // measured 0
      maxLostVoiceRate: 0.01, // measured 0
      maxJitterCents: 2.5, // measured 1.08
      maxNoteFlipsPerSec: 0.5, // measured 0
    },
    {
      bandId: 'mid',
      maxMedianAbsCents: 1, // measured 0.28
      maxP95AbsCents: 3, // measured 1.17
      maxOctaveErrorRate: 0.001, // measured 0
      maxLostVoiceRate: 0.01, // measured 0
      maxJitterCents: 2, // measured 0.52
      maxNoteFlipsPerSec: 0.5, // measured 0
    },
    {
      bandId: 'upper-mid',
      maxMedianAbsCents: 2, // measured 0.91
      maxP95AbsCents: 6, // measured 2.80
      maxOctaveErrorRate: 0.001, // measured 0
      maxLostVoiceRate: 0.01, // measured 0
      maxJitterCents: 2, // measured 0.61
      maxNoteFlipsPerSec: 0.5, // measured 0
    },
    {
      bandId: 'high',
      maxMedianAbsCents: 4, // measured 1.65
      maxP95AbsCents: 20, // measured 12.27
      maxOctaveErrorRate: 0.001, // measured 0
      maxLostVoiceRate: 0.01, // measured 0
      maxJitterCents: 3, // measured 0.95
      maxNoteFlipsPerSec: 0.5, // measured 0
    },
    {
      // pinned failure — see the module comment. Measured: 100%.
      bandId: 'above-range',
      minOctaveErrorRate: 0.9,
    },
  ],
};

export const BUDGETS: DetectorBudget[] = [SHIPPING_BUDGET];

export function budgetFor(configId: string): DetectorBudget | undefined {
  return BUDGETS.find((b) => b.configId === configId);
}

/**
 * Real-corpus budgets: **deliberately empty until recordings exist.**
 *
 * There is no defensible way to write these in advance. Real-corpus error is
 * the sum of detector error and annotator error, and until the corpus exists
 * nobody knows the size of the second term — a number invented now would be
 * either so loose it never fires or so tight it fires on the first real
 * recording, and both teach people to ignore it.
 *
 * Fill this in from the first run over a corpus with verified annotations, the
 * same way `SHIPPING_BUDGET` was filled in: measure, round up, record the
 * measured value in a comment. Until then the report states the real-corpus
 * numbers without judging them, which is the honest thing for it to do.
 */
export const REAL_CORPUS_BUDGETS: DetectorBudget[] = [];

export function realBudgetFor(configId: string): DetectorBudget | undefined {
  return REAL_CORPUS_BUDGETS.find((b) => b.configId === configId);
}

/* ------------------------------------------------------------------ *
 * Checking                                                            *
 * ------------------------------------------------------------------ */

function checkMax(
  violations: BudgetViolation[],
  bandId: string,
  metric: string,
  measured: number | undefined | null,
  limit: number | undefined
): void {
  if (limit === undefined || measured === null || measured === undefined || Number.isNaN(measured)) return;
  if (measured > limit) violations.push({ bandId, metric, measured, limit, direction: 'over' });
}

function checkMin(
  violations: BudgetViolation[],
  bandId: string,
  metric: string,
  measured: number | undefined | null,
  limit: number | undefined
): void {
  if (limit === undefined || measured === null || measured === undefined || Number.isNaN(measured)) return;
  if (measured < limit) violations.push({ bandId, metric, measured, limit, direction: 'under' });
}

/**
 * Compare a report against a budget.
 *
 * A band the budget names but the report does not contain is itself a
 * violation: it means the corpus stopped covering an operating range the app
 * claims to support, and silently passing would be the worst possible outcome
 * of a shrinking test set.
 */
export function checkBudget(report: BenchmarkReport, budget: DetectorBudget): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  const byId = new Map<string, BandMetrics>(report.bands.map((b) => [b.bandId, b]));

  for (const band of budget.bands) {
    const measured = byId.get(band.bandId);
    if (!measured) {
      violations.push({ bandId: band.bandId, metric: 'coverage', measured: 0, limit: 1, direction: 'under' });
      continue;
    }
    checkMax(violations, band.bandId, 'medianAbsCents', measured.accuracy?.absCents.median, band.maxMedianAbsCents);
    checkMax(violations, band.bandId, 'p95AbsCents', measured.accuracy?.absCents.p95, band.maxP95AbsCents);
    checkMax(violations, band.bandId, 'octaveErrorRate', measured.octave?.errorRate, band.maxOctaveErrorRate);
    checkMin(violations, band.bandId, 'octaveErrorRate', measured.octave?.errorRate, band.minOctaveErrorRate);
    checkMax(violations, band.bandId, 'lostVoiceRate', measured.voicing.lostVoiceRate, band.maxLostVoiceRate);
    checkMax(violations, band.bandId, 'jitterCents', measured.stability?.jitterCents, band.maxJitterCents);
    checkMax(violations, band.bandId, 'noteFlipsPerSec', measured.stability?.noteFlipsPerSec, band.maxNoteFlipsPerSec);
  }

  // false pitch is a whole-corpus property: it is measured on the material that
  // has no pitch at all, which belongs to no band
  /**
   * Synthetic cases only.
   *
   * `SHIPPING_BUDGET` is documented as measured against the synthetic corpus,
   * and every limit in it was derived there. Pooling real recordings into the
   * same check compares the detector against numbers that were never about it:
   * the first VocalSet ingest failed `falsePitchRate` at 11% purely because
   * real recordings contain breath and silence that the synthetic corpus does
   * not, and the budget had no opinion about that because it could not have.
   *
   * Real-corpus limits belong in `REAL_CORPUS_BUDGETS`, recorded from real
   * measurements once the corpus is trusted.
   */
  const syntheticCases = report.cases.filter((c) => c.corpusKind === 'synthetic');
  const worstFalsePitch = syntheticCases.reduce((m, c) => Math.max(m, c.voicing.falsePitchRate), 0);
  checkMax(violations, 'corpus', 'falsePitchRate', worstFalsePitch, budget.maxFalsePitchRate);
  checkMax(violations, 'corpus', 'medianSettlingMs', report.latency.medianSettlingMs, budget.maxMedianSettlingMs);
  // deliberately loose and machine-dependent: this catches an accidental
  // complexity regression (a wider search, a re-introduced O(n²) pass), not a
  // busy laptop
  checkMax(violations, 'corpus', 'realTimeFactor', report.latency.realTimeFactor, budget.maxRealTimeFactor);

  return violations;
}

export function formatViolations(violations: BudgetViolation[]): string {
  if (violations.length === 0) return 'all budgets met';
  return violations
    .map(
      (v) =>
        `  ${v.bandId}/${v.metric}: ${v.measured.toFixed(4)} ${v.direction === 'over' ? '>' : '<'} ${v.limit} (budget)`
    )
    .join('\n');
}
