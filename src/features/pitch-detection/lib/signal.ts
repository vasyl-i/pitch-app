/**
 * Reusable frame-conditioning primitives that sit between the raw pitch engine
 * and a feature's scoring logic.
 *
 * Each of these existed before as loose variables inside one session hook, so
 * every new listening feature either re-derived them or silently went without:
 * staff practice had the voice gate and the smoother, range detection had the
 * sustain tracker, and ear training had neither — it pushed raw YIN output
 * straight into scoring. Extracting them makes the conditioning a deliberate,
 * per-feature choice instead of an accident of which hook you copied.
 *
 * Constants are the tuned values these were extracted with; behaviour at the
 * original call sites is unchanged.
 */

/* ------------------------------------------------------------------ *
 * Voice gate                                                          *
 * ------------------------------------------------------------------ */

/** enter threshold, as a multiple of the noise floor */
const VOICE_ENTER_FLOOR = 1.7;
/** lower threshold to *stay* voiced while a note continues */
const VOICE_SUSTAIN_FLOOR = 1.15;
/** absolute floor, so a silent room can't gate itself open */
const VOICE_ABS_MIN = 0.004;
const CONTINUITY_MS = 400;
const CONTINUITY_SEMITONES = 1.2;
/** ~20s of history at the engine's frame rate */
const RMS_HISTORY = 860;
/** noise floor is taken at this quantile of recent RMS */
const FLOOR_QUANTILE = 0.1;
/**
 * Background frames required before the learned floor outranks the absolute
 * minimum (~0.25s at the engine's frame rate). Guards the estimate against a
 * handful of unrepresentative samples early in a session.
 */
const MIN_FLOOR_SAMPLES = 20;

export interface VoiceGate {
  /**
   * Decide whether this frame is the singer's voice. `midi` is the raw
   * detected pitch (null when the detector found none). Always call this —
   * it also feeds the rolling noise-floor estimate.
   */
  accept(rms: number, midi: number | null, now: number): boolean;
  /**
   * Latch a frame as genuinely voiced, which is what later frames measure
   * continuity against. Kept separate from `accept` because a caller may
   * discard an accepted frame for its own reasons (staff practice ignores
   * anything sung during the lead-in) and such frames must not establish
   * continuity.
   */
  confirm(midi: number, now: number): void;
  reset(): void;
}

/**
 * Adaptive two-level gate: it learns the room's noise floor from a rolling
 * window and needs a clear margin above it to *open*, but a smaller margin to
 * *stay* open while the singer holds a note. That hysteresis is what keeps a
 * decaying sustained tone from flickering off, without letting speaker bleed
 * or room tone read as singing.
 */
export function createVoiceGate(): VoiceGate {
  const rmsHistory: number[] = [];
  let lastVoiceAt = 0;
  let lastVoiceMidi: number | null = null;

  return {
    accept(rms, midi, now) {
      // Floor first, from the history as it stands — this frame joins it only
      // if it turns out NOT to be the singer (see below). Until enough
      // background has actually been observed the estimate is not used at
      // all, so one stray sample cannot raise the bar on its own; the
      // absolute minimum covers that window.
      const sorted = [...rmsHistory].sort((a, b) => a - b);
      const floor =
        rmsHistory.length >= MIN_FLOOR_SAMPLES ? (sorted[Math.floor(sorted.length * FLOOR_QUANTILE)] ?? 0) : 0;

      const continues =
        midi !== null &&
        lastVoiceMidi !== null &&
        now - lastVoiceAt < CONTINUITY_MS &&
        Math.abs(midi - lastVoiceMidi) < CONTINUITY_SEMITONES;

      const isVoice =
        midi !== null &&
        (rms > Math.max(VOICE_ABS_MIN, floor * VOICE_ENTER_FLOOR) ||
          (rms > Math.max(VOICE_ABS_MIN, floor * VOICE_SUSTAIN_FLOOR) && continues));

      /**
       * Only background feeds the background estimate.
       *
       * Every frame used to be pushed here, which made the gate defeat
       * itself on sustained singing: the history is 20s deep, so someone
       * singing continuously fills it entirely with their own voice, the
       * 10th percentile climbs to the quiet end of that voice, and
       * `floor × 1.7` ends up *above* the level they are actually singing at.
       * Measured on synthetic legato and vibrato phrases: every frame
       * rejected, zero notes displayed. Short exercises hid it — a 5s phrase
       * never fills the window — so it took long backing-track takes to
       * surface.
       *
       * Excluding voiced frames alone is not enough. The detector finds no
       * pitch for a few frames at each legato note transition, and those
       * frames are loud — they are the singer mid-phrase, not the room. Four
       * of them were sufficient to poison the estimate and shut the gate for
       * the rest of a phrase. So the test is "is the room speaking for
       * itself", which means: not voiced, and not within a phrase we are
       * still hearing.
       *
       * When the singer never pauses, the estimate simply holds — the
       * correct answer, since the room has not changed either.
       */
      const midPhrase = now - lastVoiceAt < CONTINUITY_MS;
      if (!isVoice && !midPhrase) {
        rmsHistory.push(rms);
        if (rmsHistory.length > RMS_HISTORY) rmsHistory.shift();
      }

      return isVoice;
    },

    confirm(midi, now) {
      lastVoiceAt = now;
      lastVoiceMidi = midi;
    },

    reset() {
      rmsHistory.length = 0;
      lastVoiceAt = 0;
      lastVoiceMidi = null;
    },
  };
}

/* ------------------------------------------------------------------ *
 * Pitch smoother — moved out of the production path                   *
 * ------------------------------------------------------------------ *
 *
 * `createPitchSmoother` now lives in `lib/experimental/pitchSmoother`. It was
 * measured as the largest source of user-visible pitch error on real singing
 * (20.11% of frames mis-coloured against 3.78% raw), because its group delay
 * turns pitch velocity into pitch error. Nothing in the app should smooth pitch
 * before scoring; visual calm is handled by
 * `features/pitch-visualization/lib/noteStabilizer`, which stabilizes the
 * displayed *note name* and leaves every pitch value alone.
 *
 * It is kept, unchanged, as a benchmark comparison arm. See
 * docs/PITCH_SMOOTHER_ANALYSIS.md.
 */

/* ------------------------------------------------------------------ *
 * UI throttle                                                         *
 * ------------------------------------------------------------------ */

/**
 * Rate limiter for store writes. The engine emits ~43 frames/sec and
 * re-rendering at that rate lags the JS thread (measured in the phase-2
 * spike), so every consumer throttles — each one used to hand-roll its own
 * `lastUpdate` variable with a different interval.
 */
export function createThrottle(defaultIntervalMs: number): (now: number, intervalMs?: number) => boolean {
  let last = 0;
  return (now, intervalMs = defaultIntervalMs) => {
    if (now - last < intervalMs) return false;
    last = now;
    return true;
  };
}

/* ------------------------------------------------------------------ *
 * Sustain tracker                                                     *
 * ------------------------------------------------------------------ */

export interface SustainTracker {
  /**
   * Feed a raw MIDI value; returns the rounded pitch once it has been *held*
   * long enough to trust, otherwise null. Feed `null` for an unvoiced frame.
   */
  push(midi: number | null, now: number): number | null;
  reset(): void;
}

/**
 * Only reports a pitch the singer actually sustained. Range detection relies
 * on this: a single YIN octave error must never be able to widen someone's
 * recorded range, so a note has to be held before it counts.
 */
export function createSustainTracker(sustainMs = 260, sameNoteSemitones = 0.8): SustainTracker {
  let candidate: { midi: number; since: number } | null = null;

  return {
    push(midi, now) {
      if (midi === null) {
        candidate = null;
        return null;
      }
      if (candidate && Math.abs(midi - candidate.midi) <= sameNoteSemitones) {
        return now - candidate.since >= sustainMs ? Math.round(candidate.midi) : null;
      }
      candidate = { midi, since: now };
      return null;
    },

    reset() {
      candidate = null;
    },
  };
}

/* ------------------------------------------------------------------ *
 * Stability tracker                                                   *
 * ------------------------------------------------------------------ */

export interface StabilityTracker {
  /**
   * Feed a (smoothed) MIDI value. Returns the rolling pitch jitter over the
   * window, in cents (standard deviation), or null until enough samples have
   * accumulated. A high value means the pitch is wandering — vocal fry's
   * irregular glottal pulses and a strained/breaking note both read this way,
   * which is what lets a single "reject unstable pitch" gate stand in for
   * both without a fragile frequency-band special case.
   */
  push(midi: number, now: number): number | null;
  reset(): void;
}

const STABILITY_WINDOW_MS = 500;
const STABILITY_MIN_SAMPLES = 3;

export function createStabilityTracker(windowMs = STABILITY_WINDOW_MS): StabilityTracker {
  let samples: { midi: number; at: number }[] = [];

  return {
    push(midi, now) {
      samples.push({ midi, at: now });
      while (samples.length && now - samples[0].at > windowMs) samples.shift();
      if (samples.length < STABILITY_MIN_SAMPLES) return null;

      const mean = samples.reduce((a, s) => a + s.midi, 0) / samples.length;
      const variance = samples.reduce((a, s) => a + (s.midi - mean) ** 2, 0) / samples.length;
      return Math.sqrt(variance) * 100; // semitone stdev -> cents
    },

    reset() {
      samples = [];
    },
  };
}

/* ------------------------------------------------------------------ *
 * Vibrato detector                                                    *
 * ------------------------------------------------------------------ */

export interface VibratoState {
  active: boolean;
  /** oscillation rate, Hz */
  rateHz: number;
  /** peak-to-peak swing, cents */
  extentCents: number;
}

export interface VibratoDetector {
  /** feed a (smoothed) MIDI value; returns the current estimate over the window */
  push(midi: number, now: number): VibratoState;
  reset(): void;
}

const VIBRATO_WINDOW_MS = 1200;
const VIBRATO_MIN_SAMPLES = 6;
const VIBRATO_MIN_HZ = 4;
const VIBRATO_MAX_HZ = 8;
const VIBRATO_MIN_EXTENT_CENTS = 15;

const IDLE_VIBRATO: VibratoState = { active: false, rateHz: 0, extentCents: 0 };

/**
 * A singer's healthy vibrato oscillates the pitch ~4-8Hz by a noticeable
 * margin — the same kind of pitch movement that would otherwise look like
 * "unstable" jitter to a variance-based check. Zero-crossing rate around the
 * window's own mean, plus peak-to-peak extent, is enough to tell the two
 * apart without a full spectral analysis on a JS thread that's already busy.
 */
export function createVibratoDetector(windowMs = VIBRATO_WINDOW_MS): VibratoDetector {
  let samples: { midi: number; at: number }[] = [];

  return {
    push(midi, now) {
      samples.push({ midi, at: now });
      while (samples.length && now - samples[0].at > windowMs) samples.shift();
      if (samples.length < VIBRATO_MIN_SAMPLES) return IDLE_VIBRATO;

      const mean = samples.reduce((a, s) => a + s.midi, 0) / samples.length;
      const centered = samples.map((s) => (s.midi - mean) * 100); // cents from local mean

      let crossings = 0;
      for (let i = 1; i < centered.length; i++) {
        if (centered[i - 1] < 0 !== centered[i] < 0) crossings++;
      }
      const spanSec = (samples[samples.length - 1].at - samples[0].at) / 1000;
      const rateHz = spanSec > 0 ? crossings / 2 / spanSec : 0;
      const extentCents = Math.max(...centered) - Math.min(...centered);

      return {
        active: rateHz >= VIBRATO_MIN_HZ && rateHz <= VIBRATO_MAX_HZ && extentCents >= VIBRATO_MIN_EXTENT_CENTS,
        rateHz,
        extentCents,
      };
    },

    reset() {
      samples = [];
    },
  };
}
