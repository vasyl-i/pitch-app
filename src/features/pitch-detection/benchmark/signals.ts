/**
 * Synthetic signal generators for the pitch-detection test suite and for the
 * benchmark harness in this folder.
 *
 * The DSP core had no repeatable tests: every YIN regression so far was caught
 * by ear, which means threshold changes could only be argued about, never
 * measured. These generators produce the standard evaluation set (pure tones,
 * voice-like harmonic stacks, scales, arpeggios, legato/staccato phrasing,
 * vibrato, whisper, room noise) at a caller-chosen analysis rate, so a test can
 * state an accuracy budget in cents and hold the engine to it — and so the
 * benchmark can render the same material again for a different detector
 * configuration.
 *
 * Everything is deterministic — noise uses a seeded LCG, not Math.random —
 * because a flaky DSP test is worse than no test: it trains people to re-run
 * the suite until it passes. Nothing here reads a clock, an environment
 * variable or a file, so the corpus is identical on every machine; that is what
 * makes a recorded baseline worth comparing against.
 *
 * `__tests__/fixtures/signals.ts` re-exports this module, so the YIN suite
 * keeps its original import path.
 */

/** the rate YIN actually sees, after the engine's 4x decimation of 44.1kHz */
export const ANALYSIS_RATE = 11025;
/** the engine's analysis window, in samples at ANALYSIS_RATE (~46ms) */
export const WINDOW = 512;
/** the engine's hop, in samples at ANALYSIS_RATE (~11.6ms) */
export const HOP = 128;

/** Deterministic uniform noise in [-1, 1). Seeded LCG (Numerical Recipes). */
export function seededNoise(count: number, seed = 1): Float32Array {
  const out = new Float32Array(count);
  let state = seed >>> 0;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out[i] = (state / 0x80000000) - 1;
  }
  return out;
}

export interface ToneOptions {
  /** number of harmonics including the fundamental; 1 = pure sine */
  harmonics?: number;
  /** amplitude of harmonic n is rolloff^(n-1) — lower = darker/duller timbre */
  rolloff?: number;
  /** peak amplitude of the fundamental before normalization */
  amplitude?: number;
  /** additive white noise as a fraction of `amplitude` (breathiness / room) */
  noiseLevel?: number;
  /** vibrato rate in Hz (0 = none) */
  vibratoRateHz?: number;
  /** vibrato depth, peak-to-peak, in cents */
  vibratoCents?: number;
  /** constant offset added to every sample (rumble / DC bias) */
  dcOffset?: number;
  /** starting phase in radians — lets segments be concatenated without clicks */
  phase?: number;
  seed?: number;
}

/**
 * A steady tone of `freq` Hz. With `harmonics > 1` this approximates a sung
 * vowel: a harmonic stack over one fundamental, which is what makes octave
 * errors possible in the first place (a strong 2nd harmonic looks like a
 * fundamental an octave up to a period-based detector).
 */
export function tone(freq: number, sampleCount: number, sampleRate = ANALYSIS_RATE, opts: ToneOptions = {}): Float32Array {
  const {
    harmonics = 1,
    rolloff = 0.6,
    amplitude = 0.3,
    noiseLevel = 0,
    vibratoRateHz = 0,
    vibratoCents = 0,
    dcOffset = 0,
    phase = 0,
    seed = 7,
  } = opts;

  const out = new Float32Array(sampleCount);
  const noise = noiseLevel > 0 ? seededNoise(sampleCount, seed) : null;

  // integrate instantaneous frequency so vibrato is phase-continuous
  let phaseAcc = phase;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const vibrato =
      vibratoRateHz > 0 && vibratoCents > 0
        ? Math.pow(2, ((vibratoCents / 2) * Math.sin(2 * Math.PI * vibratoRateHz * t)) / 1200)
        : 1;
    phaseAcc += (2 * Math.PI * freq * vibrato) / sampleRate;

    let sample = 0;
    for (let h = 1; h <= harmonics; h++) sample += Math.pow(rolloff, h - 1) * Math.sin(phaseAcc * h);

    out[i] = amplitude * sample + dcOffset + (noise ? amplitude * noiseLevel * noise[i] : 0);
  }
  return out;
}

/** Broadband noise only — the whisper / unvoiced-consonant case (no f0 exists). */
export function whisper(sampleCount: number, amplitude = 0.15, seed = 11): Float32Array {
  const raw = seededNoise(sampleCount, seed);
  const out = new Float32Array(sampleCount);
  // one-pole highpass, so it reads as breath rather than rumble
  let prev = 0;
  for (let i = 0; i < sampleCount; i++) {
    const hp = raw[i] - prev;
    prev = raw[i];
    out[i] = amplitude * hp;
  }
  return out;
}

export function silence(sampleCount: number): Float32Array {
  return new Float32Array(sampleCount);
}

export function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Add `b` into `a` (same length), e.g. layering room noise under a tone. */
export function mix(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] ?? 0);
  return out;
}

/* ------------------------------------------------------------------ *
 * Musical material                                                    *
 * ------------------------------------------------------------------ */

export const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** semitone offsets from the tonic */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10, 12];
export const CHROMATIC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const MAJOR_ARPEGGIO = [0, 4, 7, 12, 7, 4, 0];
/** the interval-jump set: leaps a melody-tracking engine must not smear */
export const INTERVAL_JUMPS = [0, 7, 0, 12, 0, 5, 0, 9];

export interface NoteEvent {
  midi: number;
  /** sample index where the note starts */
  start: number;
  /** sample count */
  length: number;
}

export interface PhraseOptions extends ToneOptions {
  /** sounding time per note, seconds */
  noteSec?: number;
  /** silence between notes, seconds — 0 for legato, >0 for staccato */
  gapSec?: number;
  sampleRate?: number;
}

/**
 * Render a sequence of semitone offsets as one signal, returning both the
 * audio and its exact reference pitch. Phase carries across notes so legato phrases
 * have no click at the boundary — a click would give the detector an
 * artificial onset cue that a real legato slur does not provide.
 */
export function phrase(
  tonicMidi: number,
  offsets: readonly number[],
  opts: PhraseOptions = {}
): { signal: Float32Array; notes: NoteEvent[] } {
  const { noteSec = 0.5, gapSec = 0, sampleRate = ANALYSIS_RATE, ...toneOpts } = opts;
  const noteLen = Math.round(noteSec * sampleRate);
  const gapLen = Math.round(gapSec * sampleRate);

  const parts: Float32Array[] = [];
  const notes: NoteEvent[] = [];
  let at = 0;
  let phaseAcc = 0;

  for (const offset of offsets) {
    const midi = tonicMidi + offset;
    const freq = midiToHz(midi);
    parts.push(tone(freq, noteLen, sampleRate, { ...toneOpts, phase: phaseAcc }));
    phaseAcc = (phaseAcc + (2 * Math.PI * freq * noteLen) / sampleRate) % (2 * Math.PI);
    notes.push({ midi, start: at, length: noteLen });
    at += noteLen;
    if (gapLen > 0) {
      parts.push(silence(gapLen));
      at += gapLen;
    }
  }

  return { signal: concat(...parts), notes };
}

/* ------------------------------------------------------------------ *
 * Analysis helpers                                                    *
 * ------------------------------------------------------------------ */

/** Slide the engine's window over a signal, calling `fn` per analysis frame. */
export function forEachFrame(
  signal: Float32Array,
  fn: (window: Float32Array, frameIndex: number, centerSample: number) => void,
  windowSize = WINDOW,
  hop = HOP
): void {
  let frame = 0;
  for (let start = 0; start + windowSize <= signal.length; start += hop, frame++) {
    fn(signal.subarray(start, start + windowSize), frame, start + windowSize / 2);
  }
}

/** Signed cents from a detected frequency to the expected one. */
export function centsError(detectedHz: number, expectedHz: number): number {
  return 1200 * Math.log2(detectedHz / expectedHz);
}

/** Cents error folded into the nearest octave — isolates tuning from octave errors. */
export function centsErrorOctaveAgnostic(detectedHz: number, expectedHz: number): number {
  let c = centsError(detectedHz, expectedHz) % 1200;
  if (c > 600) c -= 1200;
  if (c < -600) c += 1200;
  return c;
}

/** How many octaves off (rounded) the detection is; 0 when correct. */
export function octaveError(detectedHz: number, expectedHz: number): number {
  return Math.round(Math.log2(detectedHz / expectedHz));
}

/* ------------------------------------------------------------------ *
 * Step and polyphonic material (benchmark-only)                       *
 * ------------------------------------------------------------------ */

export interface PitchStepResult {
  signal: Float32Array;
  /** sample index of the first sample at the new pitch */
  stepSample: number;
  fromHz: number;
  toHz: number;
}

/**
 * Two sustained pitches spliced at a known instant, phase-continuous.
 *
 * This is the only way to measure *response* latency rather than the analytic
 * kind: window fill and hop quantization can be computed from the
 * configuration, but how long the detector actually takes to abandon the old
 * period and settle on the new one is a property of the algorithm and its
 * thresholds, and has to be observed. The splice is phase-continuous on
 * purpose — a discontinuity is a transient the detector could key off, which a
 * real legato slide never provides, and would flatter the measurement.
 */
export function pitchStep(
  fromHz: number,
  toHz: number,
  holdSec = 0.5,
  sampleRate = ANALYSIS_RATE,
  opts: ToneOptions = {}
): PitchStepResult {
  const holdLen = Math.round(holdSec * sampleRate);
  const first = tone(fromHz, holdLen, sampleRate, opts);
  const carriedPhase = ((2 * Math.PI * fromHz * holdLen) / sampleRate) % (2 * Math.PI);
  const second = tone(toHz, holdLen, sampleRate, { ...opts, phase: carriedPhase });
  return { signal: concat(first, second), stepSample: holdLen, fromHz, toHz };
}

/**
 * A three-note chord over a bass, i.e. what leaks from a speaker during
 * accompaniment. Periodic enough to look exactly like a voice to a
 * period-based detector — the material behind the audit's finding that clarity
 * cannot discriminate the singer from the backing track.
 */
export function chordMix(rootHz: number, sampleCount: number, sampleRate = ANALYSIS_RATE): Float32Array {
  const bass = tone(rootHz / 2, sampleCount, sampleRate, { harmonics: 8, amplitude: 0.25 });
  const third = tone(rootHz * Math.pow(2, 4 / 12), sampleCount, sampleRate, { harmonics: 6, amplitude: 0.15 });
  const fifth = tone(rootHz * Math.pow(2, 7 / 12), sampleCount, sampleRate, { harmonics: 6, amplitude: 0.15 });
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) out[i] = bass[i] + third[i] + fifth[i];
  return out;
}
