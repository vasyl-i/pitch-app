/**
 * `npm run benchmark` — run the harness and print the report.
 *
 *   npm run benchmark                       every registered configuration
 *   npm run benchmark -- --config yin-11k-w512
 *   npm run benchmark -- --check            fail the process on a budget violation
 *   npm run benchmark -- --update-baseline  re-record the committed baselines
 *   npm run benchmark -- --json             machine-readable output only
 *
 * `--check` is what CI would run. `--update-baseline` is deliberately a
 * separate, explicit act: re-recording should be a decision someone makes after
 * reading a diff, never a side effect of running the tool.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIGS, configById } from './detectors';
import { REAL_CORPUS_DIR, describeCorpus, loadRealCorpus } from './realCorpusLoader';
import { budgetFor, checkBudget, formatViolations } from './budgets';
import { diffBaseline, formatComparison, formatReport, toBaseline, toRealBaseline } from './report';
import { runBenchmark } from './runner';
import type { BenchmarkReport } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(HERE, 'baselines');

function baselinePath(configId: string): string {
  return join(BASELINE_DIR, `${configId}.json`);
}

function readBaseline(configId: string): unknown | null {
  try {
    return JSON.parse(readFileSync(baselinePath(configId), 'utf8'));
  } catch {
    return null;
  }
}

function writeBaseline(report: BenchmarkReport): string[] {
  mkdirSync(BASELINE_DIR, { recursive: true });
  const written: string[] = [];

  const path = baselinePath(report.config.id);
  writeFileSync(path, `${JSON.stringify(toBaseline(report), null, 2)}\n`);
  written.push(path);

  // The real-corpus record lives in its own file: it is expected to move when
  // recordings are added, and the synthetic baseline must not.
  const real = toRealBaseline(report);
  if (real !== null) {
    const realPath = join(BASELINE_DIR, `real-${report.config.id}.json`);
    writeFileSync(realPath, `${JSON.stringify(real, null, 2)}\n`);
    written.push(realPath);
  }
  return written;
}

function main(): void {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const requested = value('config');
  const configs = requested
    ? requested
        .split(',')
        .map((id) => {
          const config = configById(id.trim());
          if (!config) throw new Error(`unknown config "${id}" — known: ${CONFIGS.map((c) => c.id).join(', ')}`);
          return config;
        })
    : CONFIGS;

  // The real corpus is loaded per configuration because decimation depends on
  // it; an empty or absent directory is the normal state and yields no cases.
  const corpusDir = value('corpus-dir') ?? join(HERE, '..', '..', '..', '..', REAL_CORPUS_DIR);
  const loaded = configs.map((config) => loadRealCorpus(corpusDir, config));

  const reports = configs.map((config, i) => runBenchmark(config, { realCases: loaded[i].cases }));

  if (!flag('json')) {
    process.stdout.write(`${describeCorpus(loaded[0])}\n\n`);
  }

  if (flag('json')) {
    process.stdout.write(`${JSON.stringify(reports.map(toBaseline), null, 2)}\n`);
    return;
  }

  for (const report of reports) {
    process.stdout.write(`${formatReport(report)}\n\n`);
  }

  if (reports.length > 1) {
    process.stdout.write(`Configuration comparison\n${formatComparison(reports)}\n\n`);
  }

  let failed = false;

  for (const report of reports) {
    const budget = budgetFor(report.config.id);
    if (budget) {
      const violations = checkBudget(report, budget);
      process.stdout.write(`Budget · ${report.config.id}\n${formatViolations(violations)}\n`);
      if (violations.length > 0) failed = true;
    }

    if (flag('update-baseline')) {
      for (const path of writeBaseline(report)) process.stdout.write(`Baseline · wrote ${path}\n`);
      continue;
    }

    const baseline = readBaseline(report.config.id);
    if (baseline === null) {
      process.stdout.write(`Baseline · ${report.config.id}: none recorded (run with --update-baseline)\n`);
      continue;
    }
    const drift = diffBaseline(baseline, toBaseline(report));
    if (drift.length === 0) {
      process.stdout.write(`Baseline · ${report.config.id}: matches\n`);
    } else {
      process.stdout.write(`Baseline · ${report.config.id}: ${drift.length} value(s) moved\n`);
      for (const line of drift.slice(0, 40)) process.stdout.write(`  ${line}\n`);
      if (drift.length > 40) process.stdout.write(`  …and ${drift.length - 40} more\n`);
      failed = true;
    }
  }

  if (failed && flag('check')) process.exitCode = 1;
}

main();
