/**
 * Turning a report into something a person can read, and into something a
 * machine can diff.
 *
 * The two are deliberately different documents. The printed table exists to be
 * argued with — every number sits next to the band and configuration that
 * produced it. The baseline JSON exists to be committed, so a later change can
 * be shown to have moved something; it therefore drops every field that varies
 * with the machine, because a baseline that changes when nothing changed is a
 * baseline people learn to overwrite without reading.
 */
import type { BenchmarkReport, Distribution } from './types';

/* ------------------------------------------------------------------ *
 * Formatting helpers                                                  *
 * ------------------------------------------------------------------ */

/**
 * When the real corpus cannot support a cents-accuracy claim.
 *
 * Both a floor on absolute frames and a floor on share, because they guard
 * different failures. The share guard catches a corpus of expressive singing
 * with a handful of accidentally-flat frames. The count guard is what actually
 * matters for confidence in the number, and the original share-only rule was
 * written when the sustained subset was 96 frames — at 12,684 frames from 100
 * recordings a 19% share is a perfectly sound basis, and warning about it would
 * be crying wolf.
 *
 * The selection-bias worry that motivated the share guard is also measurable,
 * and on this corpus it does not bite: median error is flat at 1.6–2.0¢ across
 * every spread bin from 5¢ to 20¢, so restricting to the flattest frames is not
 * cherry-picking easy ones. Re-check that curve before trusting the subset on a
 * corpus with different material.
 */
const MIN_STEADY_FRAMES = 2000;
const MIN_STEADY_SHARE = 0.1;

function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === 0 ? (c ?? '').padEnd(widths[i]) : (c ?? '').padStart(widths[i]))).join('  ');
  return [line(headers), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

/* ------------------------------------------------------------------ *
 * Human-readable report                                               *
 * ------------------------------------------------------------------ */

export function formatReport(report: BenchmarkReport): string {
  const { config, corpus, latency, confidence } = report;
  const out: string[] = [];

  out.push(config.label);
  out.push(
    `  analysis ${config.analysisRateHz}Hz · window ${config.windowSamples} (${num(
      (config.windowSamples / config.analysisRateHz) * 1000,
      1
    )}ms) · hop ${config.hopSamples} (${num((config.hopSamples / config.analysisRateHz) * 1000, 1)}ms)` +
      ` · capture ${config.captureRateHz}Hz ÷${config.decimation} · stabilizer ${config.stabilizer}`
  );
  out.push(`  ${config.note}`);
  out.push(`  corpus: ${corpus.cases} cases, ${corpus.frames} frames, ${corpus.scoredFrames} scored`);
  out.push('');

  out.push('Accuracy and stability by operating range');
  out.push(
    table(
      ['band', 'cases', 'med¢', 'p95¢', 'max¢', 'bias¢', '≤10¢', '≤25¢', 'octave err', 'lost voice', 'jitter¢', 'flips/s'],
      report.bands.map((b) => [
        b.bandId,
        String(b.cases),
        num(b.accuracy?.absCents.median),
        num(b.accuracy?.absCents.p95),
        num(b.accuracy?.absCents.max),
        num(b.accuracy?.biasCents),
        pct(b.accuracy?.withinCents[10]),
        pct(b.accuracy?.withinCents[25]),
        pct(b.octave?.errorRate),
        pct(b.voicing.lostVoiceRate),
        num(b.stability?.jitterCents),
        num(b.stability?.noteFlipsPerSec, 2),
      ])
    )
  );
  out.push('');
  out.push('  Cents error is octave-folded; octave errors are counted separately in their own');
  out.push('  column. Above the declared ceiling the folded error stays small while the octave');
  out.push('  error rate goes to 100% — that pairing is the signature of the known failure.');
  out.push('');

  out.push('Latency');
  out.push(`  window fill              ${num(latency.windowMs, 1)} ms  (signal must exist before it can be analyzed)`);
  out.push(`  hop quantization         ${num(latency.hopMs, 1)} ms  (granularity of any answer)`);
  out.push(`  analytic floor           ${num(latency.analyticFloorMs, 1)} ms  (window + hop, before any settling)`);
  out.push(
    `  measured settling        ${num(latency.medianSettlingMs, 1)} ms  (median over ${latency.settling.length} pitch steps, to within 50¢)`
  );
  out.push(
    `  processing per frame     ${num(latency.processingMs.mean, 3)} ms mean, ${num(
      latency.processingMs.p95,
      3
    )} p95  [machine-dependent, not budgeted]`
  );
  out.push(`  real-time factor         ${pct(latency.realTimeFactor, 2)} of the hop it must fit inside`);
  out.push('');
  if (latency.settling.length > 0) {
    out.push(
      table(
        ['step', 'semitones', 'settling ms', 'transition frames'],
        latency.settling.map((s) => [
          `${s.fromHz.toFixed(0)}→${s.toHz.toFixed(0)}Hz`,
          String(s.semitones),
          num(s.settlingMs, 1),
          String(s.transitionFrames),
        ])
      )
    );
    out.push('');
  }

  out.push('Confidence quality');
  out.push(`  clarity                  mean ${num(confidence.clarity.mean, 3)}, median ${num(confidence.clarity.median, 3)}`);
  out.push(`  accuracy AUC             ${num(confidence.accuracyAuc, 3)}  (0.5 = tells you nothing about correctness)`);
  out.push(`  separation               ${num(confidence.separation, 3)}  (mean clarity: accurate − inaccurate frames)`);
  out.push('');
  const gate = report.clarityGate;
  out.push('  Would a clarity gate keep backing-track bleed out of the detector?');
  out.push(`    clean voice            ${num(gate.voiceClarityMedian, 3)} median`);
  out.push(`    breathy singing        ${num(gate.breathyClarityMedian, 3)} median`);
  out.push(`    polyphonic mix         ${num(gate.musicClarityMedian, 3)} median`);
  out.push(`    voice vs music AUC     ${num(report.voiceVsMusicAuc, 3)}  (ranking only — read the next two lines)`);
  out.push(`    threshold to reject the mix    ${num(gate.musicRejectingThreshold, 3)}`);
  out.push(
    `    genuine singing it also rejects ${pct(gate.voiceLostAtThatThreshold, 1)}  ← the cost of gating on clarity`
  );

  if (report.real) {
    const real = report.real;
    out.push('');
    out.push('Real-vocal corpus');
    out.push(
      `  ${real.recordings} recording(s) — ${real.sustainedRecordings} sustained, ` +
        `${real.recordings - real.sustainedRecordings} expressive; ` +
        `${real.trustedRecordings} with reference-grade annotations`
    );
    out.push(`  ${real.scoredFrames} scored frames, ${pct(real.excludedRate, 1)} excluded`);
    if (real.mislabelled.length > 0) {
      // Summarised, not enumerated. The first VocalSet ingest tripped this for
      // all 100 recordings and buried every other line of the report in
      // identical warnings — when a check fires for everything, the useful
      // signal is the count and the extremes, not the roll call.
      const worst = [...real.mislabelled].sort((a, b) => a.steadyShare - b.steadyShare);
      out.push(
        `  ⚠ ${real.mislabelled.length} of ${real.sustainedRecordings} sustained-category recording(s) do not hold still`
      );
      for (const m of worst.slice(0, 3)) {
        out.push(`      ${m.caseId} — ${pct(m.steadyShare, 0)} steady`);
      }
      if (worst.length > 3) out.push(`      …and ${worst.length - 3} more`);
      if (real.mislabelled.length === real.sustainedRecordings) {
        out.push('    Every one of them failed, which points at the threshold or the annotation');
        out.push('    rather than at the singing. Check the annotation resolution before re-recording.');
      }
    }
    if (real.annotatorErrorFloorCents !== null) {
      out.push(
        `  annotator error floor ${num(real.annotatorErrorFloorCents, 1)}¢ — detector error below this is not resolvable`
      );
    }
    if (real.trustedRecordings < real.recordings) {
      out.push(
        `  ⚠ ${real.recordings - real.trustedRecordings} recording(s) rely on unverified machine annotation`
      );
    }
    const bandRow = (b: (typeof real.bands)[number]) => [
      b.bandId,
      String(b.cases),
      num(b.accuracy?.absCents.median),
      num(b.accuracy?.absCents.p95),
      num(b.accuracy?.absCents.max),
      num(b.accuracy?.biasCents),
      pct(b.accuracy?.withinCents[10]),
      pct(b.accuracy?.withinCents[25]),
      pct(b.accuracy?.withinCents[50]),
      pct(b.octave?.errorRate),
      pct(b.voicing.lostVoiceRate),
    ];
    const headers = ['band', 'frames', 'med¢', 'p95¢', 'max¢', 'bias¢', '≤10¢', '≤25¢', '≤50¢', 'octave err', 'lost voice'];

    out.push('');
    const steadyShare = real.scoredFrames ? real.steadyFrames / real.scoredFrames : 0;
    out.push(
      `  Accuracy — sustained frames of sustained-category recordings (${real.steadyFrames} of ${real.scoredFrames} scored)`
    );
    if (real.steadyBands.length === 0) {
      out.push(
        real.sustainedRecordings === 0
          ? '    none — the corpus has no sustained-category recordings, so it cannot support an accuracy figure'
          : '    none — the sustained recordings did not hold still enough to score'
      );
    } else {
      out.push(table(headers, real.steadyBands.map(bandRow)));
    }
    if (real.steadyFrames < MIN_STEADY_FRAMES || steadyShare < MIN_STEADY_SHARE) {
      out.push('');
      out.push(
        `  ⚠ only ${real.steadyFrames} frames (${pct(steadyShare, 0)}) qualify — too few to support a cents-accuracy`
      );
      out.push('    claim. The surviving frames are also biased: the flatness test reads the annotation,');
      out.push('    so it favours frames where the annotator smoothed movement away. Record deliberately');
      out.push('    straight, sustained notes if you need an accuracy number from real voices.');
    }
    out.push('');
    out.push('  Tracking — all scored frames, including vibrato and slides');
    out.push(table(headers, real.bands.map(bandRow)));
    out.push('');
    out.push('  Quote the first table for accuracy and the second for voicing, dropouts and octave');
    out.push('  errors. Measured: scoring a vibrato phrase against a pYIN contour gives 1.27¢ where');
    out.push('  the same phrase without vibrato gives 0.39¢ — that gap is two analysis windows');
    out.push('  sampling the movement differently, not detector error.');
    out.push('');
    out.push('  Banded by each frame\'s expected pitch, not by recording. Never pooled with the');
    out.push('  synthetic bands above: those measure the algorithm against a reference that is exact');
    out.push('  by construction, these measure the whole signal path against an automatic annotation.');
    out.push('  Where they disagree, that disagreement is the finding.');
  }

  if (report.outliers.length > 0) {
    out.push('');
    out.push('Outliers (cases a band average would hide)');
    out.push(
      table(
        ['case', 'band', 'median¢', 'worst¢', 'octave err', 'flips/s', 'clarity'],
        report.outliers.map((c) => [
          c.caseId,
          c.bandId ?? '—',
          num(c.accuracy?.absCents.median),
          num(c.accuracy?.absCents.max, 1),
          pct(c.octave?.errorRate),
          num(c.stability?.noteFlipsPerSec, 1),
          num(c.confidence.clarity.median, 3),
        ])
      )
    );
  }

  return out.join('\n');
}

/** One line per config, for comparing configurations at a glance. */
export function formatComparison(reports: BenchmarkReport[]): string {
  const bandOf = (r: BenchmarkReport, id: string) => r.bands.find((b) => b.bandId === id);
  return table(
    ['configuration', 'core med¢', 'high med¢', 'above-range oct err', 'jitter¢ (core)', 'settling ms', 'ms/frame'],
    reports.map((r) => [
      r.config.id,
      num(bandOf(r, 'mid')?.accuracy?.absCents.median),
      num(bandOf(r, 'high')?.accuracy?.absCents.median),
      pct(bandOf(r, 'above-range')?.octave?.errorRate),
      num(bandOf(r, 'mid')?.stability?.jitterCents),
      num(r.latency.medianSettlingMs, 1),
      num(r.latency.processingMs.mean, 3),
    ])
  );
}

/* ------------------------------------------------------------------ *
 * Machine-diffable baseline                                           *
 * ------------------------------------------------------------------ */

function baselineDistribution(d: Distribution | undefined): Record<string, number> | null {
  if (!d) return null;
  const round = (v: number) => (Number.isNaN(v) ? NaN : Math.round(v * 1e4) / 1e4);
  return { count: d.count, mean: round(d.mean), median: round(d.median), p95: round(d.p95), max: round(d.max) };
}

/**
 * The committed form of a report — **synthetic corpus only**.
 *
 * Everything here is a deterministic function of the synthetic corpus and the
 * detector, so an unchanged pipeline reproduces this file byte for byte on any
 * machine. `processingMs` and `realTimeFactor` are excluded for exactly that
 * reason — they are real measurements, and they belong in the printed report,
 * but they are not evidence of a code change.
 *
 * Real-corpus results are deliberately **not** here, and go to
 * `toRealBaseline` instead. They are a function of which recordings happen to
 * be installed, so folding them in would make the synthetic regression gate
 * fire every time someone added or re-annotated a file — which is exactly what
 * happened on the first VocalSet ingest, where 36 values "moved" without a line
 * of pipeline code changing. A gate that cries wolf on corpus growth is a gate
 * people learn to re-record without reading.
 */
export function toBaseline(report: BenchmarkReport): unknown {
  const round = (v: number | null | undefined) =>
    v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 1e4) / 1e4;

  return {
    configId: report.config.id,
    config: {
      analysisRateHz: report.config.analysisRateHz,
      windowSamples: report.config.windowSamples,
      hopSamples: report.config.hopSamples,
      captureRateHz: report.config.captureRateHz,
      decimation: report.config.decimation,
      stabilizer: report.config.stabilizer,
    },
    corpus: report.corpus,
    bands: report.bands.map((b) => ({
      bandId: b.bandId,
      cases: b.cases,
      absCents: baselineDistribution(b.accuracy?.absCents),
      biasCents: round(b.accuracy?.biasCents),
      within10: round(b.accuracy?.withinCents[10]),
      within25: round(b.accuracy?.withinCents[25]),
      octaveErrorRate: round(b.octave?.errorRate),
      octaveLow: b.octave?.low ?? null,
      octaveHigh: b.octave?.high ?? null,
      lostVoiceRate: round(b.voicing.lostVoiceRate),
      falsePitchRate: round(b.voicing.falsePitchRate),
      jitterCents: round(b.stability?.jitterCents),
      maxFrameDeltaCents: round(b.stability?.maxFrameDeltaCents),
      noteFlipsPerSec: round(b.stability?.noteFlipsPerSec),
    })),
    latency: {
      windowMs: round(report.latency.windowMs),
      hopMs: round(report.latency.hopMs),
      analyticFloorMs: round(report.latency.analyticFloorMs),
      medianSettlingMs: round(report.latency.medianSettlingMs),
      settling: report.latency.settling.map((s) => ({
        fromHz: round(s.fromHz),
        toHz: round(s.toHz),
        semitones: s.semitones,
        settlingMs: round(s.settlingMs),
        transitionFrames: s.transitionFrames,
      })),
    },
    confidence: {
      clarity: baselineDistribution(report.confidence.clarity),
      accuracyAuc: round(report.confidence.accuracyAuc),
      separation: round(report.confidence.separation),
    },
    voiceVsMusicAuc: round(report.voiceVsMusicAuc),
    clarityGate: {
      voiceClarityMedian: round(report.clarityGate.voiceClarityMedian),
      breathyClarityMedian: round(report.clarityGate.breathyClarityMedian),
      musicClarityMedian: round(report.clarityGate.musicClarityMedian),
      musicRejectingThreshold: round(report.clarityGate.musicRejectingThreshold),
      voiceLostAtThatThreshold: round(report.clarityGate.voiceLostAtThatThreshold),
    },
    outliers: report.outliers
      .filter((c) => c.corpusKind === 'synthetic')
      .map((c) => ({
        caseId: c.caseId,
        bandId: c.bandId ?? null,
        medianAbsCents: round(c.accuracy?.absCents.median),
        maxAbsCents: round(c.accuracy?.absCents.max),
        octaveErrorRate: round(c.octave?.errorRate),
        noteFlipsPerSec: round(c.stability?.noteFlipsPerSec),
      })),
  };
}

/**
 * The committed form of the **real-corpus** results, kept separate from the
 * synthetic baseline for the reasons in `toBaseline`.
 *
 * This one is expected to move when the corpus changes — that is what it is
 * for. It answers "did the pipeline's behaviour on real singing change", and it
 * is only meaningful when read alongside the corpus manifest that produced it,
 * so the recording and annotation counts are part of the record.
 */
export function toRealBaseline(report: BenchmarkReport): unknown | null {
  if (!report.real) return null;
  const round = (v: number | null | undefined) =>
    v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 1e4) / 1e4;
  const band = (b: BenchmarkReport['bands'][number]) => ({
    bandId: b.bandId,
    frames: b.cases,
    absCents: baselineDistribution(b.accuracy?.absCents),
    biasCents: round(b.accuracy?.biasCents),
    within10: round(b.accuracy?.withinCents[10]),
    within25: round(b.accuracy?.withinCents[25]),
    within50: round(b.accuracy?.withinCents[50]),
    octaveErrorRate: round(b.octave?.errorRate),
    lostVoiceRate: round(b.voicing.lostVoiceRate),
  });

  return {
    configId: report.config.id,
    corpus: {
      recordings: report.real.recordings,
      sustainedRecordings: report.real.sustainedRecordings,
      trustedRecordings: report.real.trustedRecordings,
      frames: report.real.frames,
      scoredFrames: report.real.scoredFrames,
      steadyFrames: report.real.steadyFrames,
      excludedRate: round(report.real.excludedRate),
      bandCoverage: report.real.bandCoverage,
    },
    annotatorErrorFloorCents: round(report.real.annotatorErrorFloorCents),
    steadyBands: report.real.steadyBands.map(band),
    bands: report.real.bands.map(band),
    confidence: {
      clarity: baselineDistribution(report.real.confidence.clarity),
      accuracyAuc: round(report.real.confidence.accuracyAuc),
      separation: round(report.real.confidence.separation),
    },
  };
}

/**
 * Relative tolerance for baseline comparison, 0.1%.
 *
 * Not zero. `Math.sin` and `Math.log2` are not bit-identical across V8
 * versions, so exact equality would eventually fail for a Node upgrade and
 * teach everyone that a red baseline means nothing. 0.1% is far below any
 * change worth noticing — a median that moves from 0.6¢ to 0.7¢ is a 16% move.
 */
const BASELINE_TOLERANCE = 1e-3;

function differs(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return false;
    return Math.abs(a - b) > BASELINE_TOLERANCE * Math.max(1, Math.abs(a));
  }
  return a !== b;
}

/**
 * Every leaf where a fresh run disagrees with the committed baseline, as
 * `path: was → now`. An empty list is the whole point of committing one.
 */
export function diffBaseline(baseline: unknown, current: unknown, path = ''): string[] {
  if (baseline === null || current === null || typeof baseline !== 'object' || typeof current !== 'object') {
    return differs(baseline, current) ? [`${path || '(root)'}: ${String(baseline)} → ${String(current)}`] : [];
  }

  const out: string[] = [];
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const key of keys) {
    const next = path ? `${path}.${key}` : key;
    out.push(
      ...diffBaseline(
        (baseline as Record<string, unknown>)[key],
        (current as Record<string, unknown>)[key],
        next
      )
    );
  }
  return out;
}
