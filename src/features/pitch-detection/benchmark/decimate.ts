/**
 * Capture-rate → analysis-rate decimation, replicated from `pitchEngine`.
 *
 * ## Why this file is a duplicate, and why that is the lesser evil
 *
 * Real recordings arrive at the capture rate (44.1kHz). The detector runs at
 * the analysis rate (11.025kHz). The filter that bridges them lives inside
 * `pitchEngine`'s `onAudioReady` closure as a module-private constant, so it
 * cannot be imported, and extracting it means editing the DSP pipeline — which
 * this pass is explicitly not doing.
 *
 * That leaves three options: skip the decimator and measure the detector on
 * audio the app never actually feeds it; edit the pipeline; or replicate the
 * filter and guard the copy. The third is the only one that both honours the
 * constraint and measures the real signal path, so the tap construction below
 * is copied **verbatim** from `pitchEngine.ts` and a test compares the two
 * source blocks character for character after whitespace normalization. Change
 * either one and the test fails naming this file.
 *
 * **This module is scaffolding.** The pipeline-extraction task should delete it
 * and have both the engine and the benchmark call one shared decimator. Until
 * then the drift guard is what keeps the duplicate honest.
 */

/* ------------------------------------------------------------------ *
 * Verbatim copy — keep byte-identical to pitchEngine.ts               *
 * ------------------------------------------------------------------ */

const DECIMATE = 4;

// Anti-aliasing FIR for the 4x decimation (windowed sinc, Hamming, 24 taps,
// cutoff at the decimated Nyquist). The old boxcar average leaked aliased
// harmonics into the analysis band, degrading YIN on bright real mixes.
const FIR_TAPS = (() => {
  const N = 24;
  const fc = 0.5 / DECIMATE; // normalized cutoff
  const taps = new Float32Array(N);
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const k = n - (N - 1) / 2;
    const sinc = k === 0 ? 2 * Math.PI * fc : Math.sin(2 * Math.PI * fc * k) / k;
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    taps[n] = sinc * hamming;
    sum += taps[n];
  }
  for (let n = 0; n < N; n++) taps[n] /= sum; // unity DC gain
  return taps;
})();

/* ------------------------------------------------------------------ *
 * Offline application                                                 *
 * ------------------------------------------------------------------ */

/** The decimation factor the engine applies. Exposed for the drift guard. */
export const ENGINE_DECIMATION = DECIMATE;

/** The filter taps, for tests that need to compare them numerically. */
export const ENGINE_FIR_TAPS: Float32Array = FIR_TAPS;

/**
 * Decimate a whole signal, exactly as the engine's per-callback loop does.
 *
 * The engine carries a tail of raw samples between callbacks so the filter
 * never starves at a chunk seam; applied to a complete buffer that carry logic
 * is a no-op, because output sample `i` reads `raw[i*D .. i*D+taps-1]` from one
 * continuous stream either way. `decimateChunked` exists to prove that
 * equivalence rather than to assert it.
 */
export function decimate(input: Float32Array, factor = DECIMATE): Float32Array {
  const nTaps = FIR_TAPS.length;
  const outLength = Math.max(0, Math.floor((input.length - nTaps) / factor));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    let acc = 0;
    const base = i * factor;
    for (let k = 0; k < nTaps; k++) acc += FIR_TAPS[k] * input[base + k];
    out[i] = acc;
  }
  return out;
}

/**
 * The same decimation driven in fixed-size chunks with the engine's carry, so
 * a test can show that offline replay and the live callback path produce
 * identical samples. If this ever diverges from `decimate`, offline
 * measurements stop describing the running app.
 */
export function decimateChunked(input: Float32Array, chunkSize: number, factor = DECIMATE): Float32Array {
  const nTaps = FIR_TAPS.length;
  const pieces: Float32Array[] = [];
  let carry = new Float32Array(0);

  for (let offset = 0; offset < input.length; offset += chunkSize) {
    const chunk = input.subarray(offset, Math.min(offset + chunkSize, input.length));
    const raw = new Float32Array(carry.length + chunk.length);
    raw.set(carry, 0);
    raw.set(chunk, carry.length);

    const decLen = Math.max(0, Math.floor((raw.length - nTaps) / factor));
    const piece = new Float32Array(decLen);
    for (let i = 0; i < decLen; i++) {
      let acc = 0;
      const base = i * factor;
      for (let k = 0; k < nTaps; k++) acc += FIR_TAPS[k] * raw[base + k];
      piece[i] = acc;
    }
    pieces.push(piece);
    carry = raw.slice(decLen * factor);
  }

  const total = pieces.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const p of pieces) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Drift guard                                                         *
 * ------------------------------------------------------------------ */

/**
 * Pull the `FIR_TAPS` construction block out of a source file.
 *
 * Compared textually rather than numerically because a numeric comparison can
 * only check the taps this harness already believes in: if someone changes the
 * window function or the cutoff, recomputing both sides from the same changed
 * source would agree with itself and prove nothing. The text is the contract.
 */
export function extractFirBlock(source: string): string | null {
  const start = source.indexOf('const FIR_TAPS = (() => {');
  if (start < 0) return null;
  const end = source.indexOf('})();', start);
  if (end < 0) return null;
  return source.slice(start, end + '})();'.length);
}

/** Whitespace- and comment-insensitive form, for comparing two copies. */
export function normalizeSource(block: string): string {
  return block
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
