/**
 * The detector configurations under measurement.
 *
 * This is the registry the spec's "replaceable algorithms" requirement needs in
 * order to mean anything: until two configurations can be run over identical
 * material and compared, choosing between them is taste. Adding pYIN, MPM or a
 * neural detector later means adding an entry here — the corpus, the metrics
 * and the report do not change.
 *
 * The pipeline itself is untouched by all of this. `yinDetector` calls
 * `yinPitch` exactly as `pitchEngine` does, and nothing in `lib/` knows this
 * folder exists.
 */
import { yinPitch } from '../lib/yin';
import type { BenchmarkDetector, DetectorConfig } from './types';

/* ------------------------------------------------------------------ *
 * The shipping configuration                                          *
 * ------------------------------------------------------------------ */

/**
 * What `pitchEngine` actually does today: capture at 44.1kHz, decimate 4x
 * through a 24-tap windowed-sinc FIR, and run YIN over a 512-sample window
 * every 512 raw samples (128 decimated).
 *
 * **Coverage boundary, stated plainly:** the harness measures the detector over
 * this framing, not the capture chain that produces it. The FIR decimation and
 * the `AudioRecorder` callback are welded into `pitchEngine` and cannot be
 * driven from a file without changing it, which this pass deliberately does
 * not do. So aliasing introduced by the decimator, buffer-boundary effects and
 * real capture jitter are *not* in these numbers. Closing that gap is the first
 * task of the pipeline-extraction work, and `enginePipelineConstants` below
 * exists so the framing here cannot silently drift from the engine's in the
 * meantime.
 */
export const SHIPPING_CONFIG: DetectorConfig = {
  id: 'yin-11k-w512',
  label: 'YIN @ 11.025kHz, 512-sample window (shipping)',
  analysisRateHz: 11025,
  windowSamples: 512,
  hopSamples: 128,
  captureRateHz: 44100,
  decimation: 4,
  stabilizer: 'none',
  shipping: true,
  note: 'the engine boundary: raw detector output, exactly as PitchFrame carries it',
};

/**
 * The same detector plus the median-3 + EMA smoother every consuming feature
 * applies (`lib/experimental/pitchSmoother`). Not a different engine — this is
 * what the *app* effectively runs, and separating the two is the only way to
 * see what the smoother buys in jitter and costs in settling time.
 */
export const SMOOTHED_CONFIG: DetectorConfig = {
  ...SHIPPING_CONFIG,
  id: 'yin-11k-w512-smoothed',
  label: 'YIN @ 11.025kHz + median3/EMA smoother (as consumed)',
  stabilizer: 'median3-ema',
  shipping: false,
  note: 'retired smoother, kept as the comparison arm that justified removing it',
};

/**
 * Reference configuration at twice the analysis rate, same window *duration*.
 *
 * Present because the audit asserts that the hard octave failure above ~1kHz is
 * a sampling-resolution limit and that the only real fix is a higher analysis
 * rate at ~4x CPU. That was a reasoned claim; with this entry it becomes a
 * measured one, and the cost side of it shows up in the same report. Nothing
 * ships from this — it is here so the trade-off can be re-examined with numbers
 * whenever someone asks about the ceiling again.
 */
export const HIGH_RATE_CONFIG: DetectorConfig = {
  id: 'yin-22k-w1024',
  label: 'YIN @ 22.05kHz, 1024-sample window (reference only)',
  analysisRateHz: 22050,
  windowSamples: 1024,
  hopSamples: 256,
  captureRateHz: 44100,
  decimation: 2,
  stabilizer: 'none',
  shipping: false,
  note: 'quantifies what raising the analysis rate would buy at the top of the range',
};

export const CONFIGS: DetectorConfig[] = [SHIPPING_CONFIG, SMOOTHED_CONFIG, HIGH_RATE_CONFIG];

export function configById(id: string): DetectorConfig | undefined {
  return CONFIGS.find((c) => c.id === id);
}

/** YIN behind the benchmark's detector seam. */
export function yinDetector(config: DetectorConfig): BenchmarkDetector {
  return {
    config,
    analyze(window, sampleRate) {
      const r = yinPitch(window, sampleRate);
      return { frequency: r.frequency, clarity: r.clarity, rms: r.rms };
    },
  };
}

export function detectorFor(config: DetectorConfig): BenchmarkDetector {
  // one algorithm today; the switch is the extension point, not decoration
  return yinDetector(config);
}

/* ------------------------------------------------------------------ *
 * Drift guard                                                         *
 * ------------------------------------------------------------------ */

export interface EngineConstants {
  sampleRate: number | null;
  hop: number | null;
  decimate: number | null;
  window: number | null;
}

/**
 * Pull the framing constants out of `pitchEngine.ts` source text.
 *
 * They are module-private there and this pass may not change that, so the
 * benchmark restates them in `SHIPPING_CONFIG` — and a restatement rots. A test
 * reads the engine source and compares, so the day someone changes the hop, the
 * benchmark fails with an explanation instead of quietly measuring a framing
 * the app no longer uses.
 *
 * Text matching is the right amount of machinery here: it is precise about
 * exactly four constants and it fails loudly when the shape it expects is gone.
 */
export function enginePipelineConstants(source: string): EngineConstants {
  const read = (name: string): number | null => {
    const m = new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`).exec(source);
    return m ? Number(m[1]) : null;
  };
  return {
    sampleRate: read('SAMPLE_RATE'),
    hop: read('HOP'),
    decimate: read('DECIMATE'),
    window: read('WINDOW'),
  };
}
