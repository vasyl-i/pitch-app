/**
 * Node-side loading of the real-vocal corpus: read the directory, decode the
 * WAVs, decimate to the analysis rate, hand pure data to `realCorpus`.
 *
 * Separated from `realCorpus.ts` so the format and its reference-pitch rules stay
 * free of `node:fs` — the pure half runs anywhere the detector runs, including
 * a future on-device benchmark, and this half never has to.
 *
 * Absence is normal. The corpus directory is expected to be empty until
 * recordings are collected, and every entry point here returns an empty result
 * rather than failing, so the synthetic benchmark keeps working unchanged.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { decimate } from './decimate';
import { buildRealCase, validateRecording, type RealRecording } from './realCorpus';
import { decodeWav } from './wav';
import type { BenchmarkCase, DetectorConfig } from './types';

/** Default corpus location: outside `src/`, so Metro never bundles the audio. */
export const REAL_CORPUS_DIR = 'benchmark-corpus/real';

export interface LoadedCorpus {
  cases: BenchmarkCase[];
  recordings: RealRecording[];
  /** files that could not be used, with the reason — never silently dropped */
  rejected: { file: string; reason: string }[];
}

const EMPTY: LoadedCorpus = { cases: [], recordings: [], rejected: [] };

/**
 * Load every `<id>.wav` + `<id>.json` pair in `dir`.
 *
 * A recording is rejected, with a reason, when its metadata is malformed, its
 * provenance is incomplete, its sample rate does not match the configuration,
 * or its annotation does not cover the audio. Rejections are returned rather
 * than thrown so one bad file cannot stop a corpus run — but they are printed,
 * because a corpus that silently shrinks is a benchmark that silently gets
 * easier.
 */
export function loadRealCorpus(dir: string, config: DetectorConfig): LoadedCorpus {
  if (!existsSync(dir)) return EMPTY;

  const cases: BenchmarkCase[] = [];
  const recordings: RealRecording[] = [];
  const rejected: { file: string; reason: string }[] = [];

  const wavFiles = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.wav'))
    .sort(); // deterministic order, so the report and baseline are stable

  for (const file of wavFiles) {
    const id = basename(file, '.wav');
    const metaPath = join(dir, `${id}.json`);
    const reject = (reason: string) => rejected.push({ file, reason });

    if (!existsSync(metaPath)) {
      reject(`no ${id}.json alongside it — run scripts/annotate_vocal.py`);
      continue;
    }

    let recording: RealRecording;
    try {
      recording = JSON.parse(readFileSync(metaPath, 'utf8')) as RealRecording;
    } catch (error) {
      reject(`${id}.json is not valid JSON (${(error as Error).message})`);
      continue;
    }

    const problems = validateRecording(recording);
    if (problems.length > 0) {
      reject(problems.join('; '));
      continue;
    }

    let audio;
    try {
      const bytes = readFileSync(join(dir, file));
      audio = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    } catch (error) {
      reject((error as Error).message);
      continue;
    }

    if (audio.sampleRateHz !== config.captureRateHz) {
      // Not resampled here on purpose: a resampler in the measurement path is
      // one more thing altering the signal before the detector sees it, and
      // its artefacts would be indistinguishable from the detector's. Convert
      // at ingestion instead — the annotation script does it with afconvert.
      reject(
        `sample rate ${audio.sampleRateHz}Hz does not match the ${config.captureRateHz}Hz capture rate — re-ingest it`
      );
      continue;
    }

    if (recording.sampleRateHz !== audio.sampleRateHz) {
      reject(`metadata says ${recording.sampleRateHz}Hz but the file is ${audio.sampleRateHz}Hz`);
      continue;
    }

    const annotatedSec = recording.annotation.f0Hz.length * recording.annotation.hopSec;
    if (annotatedSec < audio.durationSec * 0.9) {
      reject(
        `annotation covers ${annotatedSec.toFixed(1)}s of ${audio.durationSec.toFixed(1)}s of audio — re-annotate it`
      );
      continue;
    }

    const analysisSignal = decimate(audio.samples, config.decimation);
    cases.push(buildRealCase(recording, analysisSignal, config.analysisRateHz));
    recordings.push(recording);
  }

  return { cases, recordings, rejected };
}

/** Human-readable summary of what a load produced, for the CLI. */
export function describeCorpus(loaded: LoadedCorpus): string {
  if (loaded.cases.length === 0 && loaded.rejected.length === 0) {
    return `real corpus: none installed (add recordings to ${REAL_CORPUS_DIR}/ — see its README)`;
  }

  const verified = loaded.recordings.filter((r) => r.annotation.verified).length;
  const lines = [
    `real corpus: ${loaded.cases.length} recording(s), ${verified} with verified annotations`,
  ];
  for (const r of loaded.rejected) lines.push(`  rejected ${r.file}: ${r.reason}`);
  return lines.join('\n');
}
