/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002) — difference function,
 * cumulative mean normalized difference, absolute-threshold search, parabolic
 * interpolation. Pure TypeScript, no dependencies, so it can migrate to the
 * shared workspace package (packages/core) unchanged.
 *
 * Performance note (measured in the phase 2 spike, apps/expo-spike): Hermes
 * runs this ~50x slower than jitted JS engines. Always feed it a decimated
 * signal (see pitchEngine) — a full-rate 44.1kHz window saturates the JS
 * thread on mobile.
 */

export interface YinResult {
  frequency: number | null;
  rms: number;
  /**
   * Periodicity confidence, 0..1 (1 = perfectly periodic). Derived from the
   * CMND dip depth at the chosen lag — the standard YIN "aperiodicity"
   * measure, inverted. Low-clarity frames are the ones dominated by breath
   * noise, vocal fry's irregular glottal pulses, or a scream's chaotic
   * spectrum, so callers that need to reject those (vocal-range detection,
   * mic calibration) gate on this rather than re-deriving it from rms/jitter.
   */
  clarity: number;
}

/**
 * CMND value a dip must clear to be accepted as the period. The paper's
 * suggested range is 0.10–0.15; 0.12 sits mid-range and is what the whole
 * accuracy table in docs/PITCH_ENGINE_AUDIT.md was measured against.
 */
const THRESHOLD = 0.12;
/** if no dip clears THRESHOLD, accept the global minimum when it's this good */
const FALLBACK_THRESHOLD = 0.3;
/**
 * Lowest period the search will consider, expressed as a frequency. This sets
 * `maxLag`, and with it how much of the window is left for the difference
 * function to integrate over (`WINDOW − maxLag` samples) — so lowering it
 * costs accuracy everywhere, not just at the bottom.
 */
const MIN_FREQ = 55;
/**
 * Silence gate, applied to the DC-removed level. Low on purpose: quiet capture
 * paths (iOS simulator routing the Mac mic) deliver very small sample
 * magnitudes; phones sit well above. Measured: detection stays exact down to
 * amplitude 0.004 and cuts off cleanly here.
 */
const RMS_GATE = 0.002;

/**
 * Octave-low guard admission limits. The half-period dip must be both
 * absolutely convincing (`MAX_CMND`) and no worse than the chosen dip by more
 * than `RATIO`. Together they keep the guard from firing on a merely
 * mediocre sub-lag.
 */
const OCTAVE_GUARD_MAX_CMND = 0.25;
const OCTAVE_GUARD_RATIO = 1.3;

/* ------------------------------------------------------------------ *
 * Declared operating range                                            *
 * ------------------------------------------------------------------ */

/**
 * The band in which this detector's output is trustworthy, measured (see
 * docs/PITCH_ENGINE_AUDIT.md §3) rather than derived from the nominal search
 * bounds — which are wider than the accuracy justifies at both ends.
 *
 * Below MIN: still detected at 100% voicing, but accuracy degrades from
 * ≤0.2¢ (65Hz and up) to ~12.6¢ at 55Hz, because the difference function gets
 * barely two periods to integrate over.
 *
 * Above MAX: **hard failure, not degradation.** At the 11.025kHz analysis
 * rate a 1047Hz tone spans only ~10.5 samples per period; its true-period dip
 * is smeared across two bins and never clears THRESHOLD, so the search locks
 * onto the sub-harmonic and reports exactly one octave low. Measured: C6, D6
 * and E6 all return −1200¢. This is a sampling-resolution limit — a threshold
 * sweep recovered only 1 of 3 failing notes and was rejected on that evidence.
 * Raising the ceiling means raising the analysis rate (~4x CPU).
 *
 * Callers that record durable facts about a singer (vocal range, in
 * particular) should treat a detection outside this band as unverified rather
 * than writing it to a profile.
 */
export const MIN_RELIABLE_F0 = 65;
export const MAX_RELIABLE_F0 = 1000;

/** Whether a detected frequency falls inside the measured-trustworthy band. */
export function isReliableF0(frequency: number): boolean {
  return frequency >= MIN_RELIABLE_F0 && frequency <= MAX_RELIABLE_F0;
}

/* ------------------------------------------------------------------ *
 * Clarity bands                                                       *
 * ------------------------------------------------------------------ */

/**
 * Named bands for `YinResult.clarity`, from the measured distribution.
 *
 * **What clarity is:** a voice-*quality* measure. Clean sustained vowel 1.00,
 * 40%-noise breathy 0.91, 80%-noise breathy 0.73. Pure noise and whisper
 * never reach here at all — they yield no frequency.
 *
 * **What clarity is NOT:** a way to tell the singer apart from music playing
 * in the room. A two-tone mix measures 0.99 and a three-tone chord with bass
 * 0.98 — indistinguishable from a clean voice. Two call sites previously
 * gated on clarity hoping to reject speaker bleed; both sat *below* the 0.73
 * floor and so filtered nothing, and no threshold would have worked. Bleed is
 * defended against structurally (`referenceGate`), by vocal-range filtering,
 * by the sustain requirement, and ultimately by headphones.
 */
export const CLARITY_CLEAN = 0.95;
/**
 * Below this the estimate is noise-dominated and should not be trusted for
 * anything durable. Chosen to sit between measured "breathy but usable"
 * (0.91) and "very breathy" (0.73).
 */
export const CLARITY_MIN_RELIABLE = 0.8;

export function yinPitch(buffer: Float32Array, sampleRate: number): YinResult {
  // Mean and mean-square in one pass, so the level below is the *AC* level:
  // rms = sqrt(E[x²] − E[x]²). YIN's difference function is DC-invariant, but
  // `rms` drives every voice gate in the app, and an uncorrected DC/rumble
  // offset inflates it by up to 47% (measured) — enough to hold a gate open
  // on a silent room.
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i];
    sumSquares += buffer[i] * buffer[i];
  }
  const mean = sum / buffer.length;
  const variance = sumSquares / buffer.length - mean * mean;
  const rms = Math.sqrt(Math.max(0, variance));
  if (rms < RMS_GATE) return { frequency: null, rms, clarity: 0 };

  const maxLag = Math.min(buffer.length - 1, Math.floor(sampleRate / MIN_FREQ));

  const diff = new Float32Array(maxLag);
  for (let tau = 1; tau < maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - maxLag; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmnd = new Float32Array(maxLag);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxLag; tau++) {
    runningSum += diff[tau];
    cmnd[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = 2; tau < maxLag; tau++) {
    if (cmnd[tau] < THRESHOLD) {
      while (tau + 1 < maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate === -1) {
    // breathy/soft voicing: no dip under the strict threshold — fall back to
    // the best local minimum if it's still convincing. Keeps held notes from
    // dropping out mid-sustain (visible as holes in the duration bar).
    let bestTau = -1;
    let bestVal = FALLBACK_THRESHOLD;
    for (let tau = 2; tau < maxLag; tau++) {
      if (cmnd[tau] < bestVal) {
        bestVal = cmnd[tau];
        bestTau = tau;
      }
    }
    if (bestTau === -1) return { frequency: null, rms, clarity: 0 };
    tauEstimate = bestTau;
  }

  // Octave-low guard: if half the period is nearly as good a dip, the true
  // pitch is an octave up (the classic YIN failure on vocals with strong 2nd
  // harmonics, and on period-doubled/creaky phonation).
  //
  // Measured: fires correctly on 12/12 period-doubled signals and never
  // false-fires across bright/dull/breathy/suppressed-fundamental timbres
  // over 82–988Hz. Deliberately left strict — a sweep that loosened it to
  // recover the >1kHz sub-harmonic failure (see MAX_RELIABLE_F0) gained 3
  // percentage points on one note out of three and was rejected.
  const halfTau = Math.round(tauEstimate / 2);
  if (halfTau >= 2 && cmnd[halfTau] < Math.min(OCTAVE_GUARD_MAX_CMND, cmnd[tauEstimate] * OCTAVE_GUARD_RATIO)) {
    tauEstimate = halfTau;
  }

  const clarity = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]));

  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < maxLag - 1) {
    const s0 = cmnd[tauEstimate - 1];
    const s1 = cmnd[tauEstimate];
    const s2 = cmnd[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      const adjustment = (s2 - s0) / denom;
      if (Number.isFinite(adjustment)) betterTau = tauEstimate + adjustment;
    }
  }

  return { frequency: sampleRate / betterTau, rms, clarity };
}
