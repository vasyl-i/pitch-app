/**
 * Developer-only per-frame diagnostics for the pitch pipeline.
 *
 * Tuning any threshold in this feature used to mean guessing: nothing could
 * be observed on a real device without attaching a debugger and stepping
 * through 86 frames a second. This records the whole frame history to a ring
 * buffer that can be dumped as CSV, so a threshold change can be argued from
 * a recording of an actual room instead of from memory of how it sounded.
 *
 * ## Zero cost in production — how it is guaranteed
 *
 * Every entry point is guarded by `DIAGNOSTICS_AVAILABLE`, which folds to the
 * literal `false` in release builds (Metro substitutes `__DEV__`, then the
 * minifier eliminates the dead branch and, with it, every call). Nothing here
 * allocates, and no `record*` body runs, unless someone explicitly turned
 * diagnostics on in a dev build. The ring buffer is only allocated on enable.
 *
 * Callers must wrap invocations in `if (DIAGNOSTICS_AVAILABLE)` so the
 * argument expressions are eliminated too — not just the function body.
 */

declare const __DEV__: boolean | undefined;

/**
 * Whether this build may collect diagnostics at all. Folds to `false` in
 * release so every guarded block is dropped by the minifier.
 */
export const DIAGNOSTICS_AVAILABLE: boolean = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/** Frames retained; ~35s at the engine's 86fps. Bounded so a long session can't grow without limit. */
const RING_CAPACITY = 3000;

/**
 * One processed frame. The raw half is written by the engine; the conditioned
 * half by whichever feature consumed the frame, because smoothing, voicing
 * and cents are per-feature choices the engine deliberately knows nothing
 * about.
 */
export interface DiagnosticFrame {
  /** wall clock, ms */
  timestamp: number;
  /** capture timestamp from the audio clock, seconds since recording start */
  audioTime: number;
  /** YIN output before any conditioning, Hz */
  rawFrequency: number | null;
  /** periodicity confidence 0..1 */
  confidence: number;
  /** AC-coupled level of the analysis window */
  rms: number;
  clipped: boolean;
  /** wall-clock ms spent inside decimation + YIN for this frame */
  processingMs: number;
  /** ms between the frame's capture time and the engine emitting it */
  latencyMs: number | null;

  /* -- filled in by the consuming feature, when it reports back -------- */
  /** post-smoother pitch, MIDI */
  filteredMidi?: number;
  /** deviation the feature graded this frame against, cents */
  cents?: number;
  /** did the feature's voice gate accept this frame? */
  voiced?: boolean;
  /** free-form tag for the feature that annotated it */
  source?: string;
}

let enabled = false;
let ring: DiagnosticFrame[] = [];
let writeIndex = 0;
let dropped = 0;

/** Start collecting. No-op (and unreachable) outside dev builds. */
export function enableDiagnostics(): void {
  if (!DIAGNOSTICS_AVAILABLE || enabled) return;
  ring = new Array<DiagnosticFrame>(RING_CAPACITY);
  writeIndex = 0;
  dropped = 0;
  enabled = true;
}

export function disableDiagnostics(): void {
  if (!DIAGNOSTICS_AVAILABLE) return;
  enabled = false;
  ring = [];
  writeIndex = 0;
}

export function isDiagnosticsEnabled(): boolean {
  return DIAGNOSTICS_AVAILABLE && enabled;
}

/**
 * Record the engine-side half of a frame. Returns the stored record so the
 * consuming feature can annotate it in place via `annotateFrame` without a
 * second lookup — the frame it just handled is by definition the newest one.
 */
export function recordFrame(frame: DiagnosticFrame): DiagnosticFrame | null {
  if (!DIAGNOSTICS_AVAILABLE || !enabled) return null;
  if (writeIndex >= RING_CAPACITY) dropped++;
  ring[writeIndex % RING_CAPACITY] = frame;
  writeIndex++;
  return frame;
}

/** Add the consumer-side view (smoothed pitch, cents, voicing) to a frame. */
export function annotateFrame(
  frame: DiagnosticFrame | null,
  patch: Pick<DiagnosticFrame, 'filteredMidi' | 'cents' | 'voiced' | 'source'>
): void {
  if (!DIAGNOSTICS_AVAILABLE || !enabled || frame === null) return;
  Object.assign(frame, patch);
}

/**
 * Annotate the most recently recorded frame. A feature handling `onFrame` is
 * by definition looking at the newest one, so this saves threading a handle
 * through `PitchFrame` and keeps the public frame type free of dev-only
 * fields.
 */
export function annotateLatestFrame(
  patch: Pick<DiagnosticFrame, 'filteredMidi' | 'cents' | 'voiced' | 'source'>
): void {
  if (!DIAGNOSTICS_AVAILABLE || !enabled || writeIndex === 0) return;
  annotateFrame(ring[(writeIndex - 1) % RING_CAPACITY] ?? null, patch);
}

/** Frames in capture order, oldest first. */
export function diagnosticFrames(): DiagnosticFrame[] {
  if (!DIAGNOSTICS_AVAILABLE || !enabled) return [];
  if (writeIndex <= RING_CAPACITY) return ring.slice(0, writeIndex);
  const start = writeIndex % RING_CAPACITY;
  return [...ring.slice(start), ...ring.slice(0, start)];
}

export interface DiagnosticsSummary {
  frames: number;
  droppedFromRing: number;
  voicedFrames: number;
  meanProcessingMs: number;
  maxProcessingMs: number;
  meanRms: number;
  /** frames whose raw pitch fell outside the detector's reliable band */
  outOfBandFrames: number;
}

export function diagnosticsSummary(): DiagnosticsSummary | null {
  if (!DIAGNOSTICS_AVAILABLE || !enabled) return null;
  const frames = diagnosticFrames();
  if (frames.length === 0) {
    return { frames: 0, droppedFromRing: dropped, voicedFrames: 0, meanProcessingMs: 0, maxProcessingMs: 0, meanRms: 0, outOfBandFrames: 0 };
  }
  let procSum = 0;
  let procMax = 0;
  let rmsSum = 0;
  let voiced = 0;
  let outOfBand = 0;
  for (const f of frames) {
    procSum += f.processingMs;
    if (f.processingMs > procMax) procMax = f.processingMs;
    rmsSum += f.rms;
    if (f.voiced) voiced++;
    if (f.rawFrequency !== null && (f.rawFrequency < 65 || f.rawFrequency > 1000)) outOfBand++;
  }
  return {
    frames: frames.length,
    droppedFromRing: dropped,
    voicedFrames: voiced,
    meanProcessingMs: procSum / frames.length,
    maxProcessingMs: procMax,
    meanRms: rmsSum / frames.length,
    outOfBandFrames: outOfBand,
  };
}

const CSV_COLUMNS = [
  'timestamp', 'audioTime', 'rawFrequency', 'filteredMidi', 'cents',
  'confidence', 'rms', 'voiced', 'clipped', 'latencyMs', 'processingMs', 'source',
] as const;

/** The whole ring as CSV — paste into a spreadsheet, or `console.log` and copy. */
export function diagnosticsToCsv(): string {
  if (!DIAGNOSTICS_AVAILABLE || !enabled) return '';
  const rows = diagnosticFrames().map((f) =>
    CSV_COLUMNS.map((c) => {
      const v = f[c];
      if (v === null || v === undefined) return '';
      return typeof v === 'number' ? String(Math.round(v * 1e4) / 1e4) : String(v);
    }).join(',')
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
}
