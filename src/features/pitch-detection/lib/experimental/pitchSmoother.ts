/**
 * EXPERIMENTAL — not part of the production pitch path.
 *
 * `createPitchSmoother` used to sit between the detector and *both* scoring and
 * rendering. It is retained here, unchanged, so the benchmark can keep measuring
 * it as a comparison arm — and so the decision to take it out of the pipeline
 * stays reproducible rather than becoming folklore.
 *
 * ## Do not put this back in the production path
 *
 * Measured over the VocalSet real-world corpus (100 recordings, 65,555 scored
 * frames; docs/PITCH_SMOOTHER_ANALYSIS.md):
 *
 * | | frames mis-coloured (>12¢) | note flips/sec |
 * |---|---|---|
 * | raw detector output | 3.78% | 4.44 |
 * | this smoother | **20.11%** | 3.62 |
 *
 * The mechanism is a validated one: this is two cascaded lag elements —
 * median-of-3 (1 frame) and an EMA at α = 0.6 (0.667 frames), 19.4 ms total —
 * and a group delay τ turns pitch velocity v into pitch error v·τ. Feeding the
 * function constant-rate ramps reproduces `v × 1.667 × hop` to two decimal
 * places at every rate tested. Synthetic sustained tones have v ≈ 0, so the cost
 * is invisible there; 83% of frames in real straight singing move faster than
 * 40 ¢/s, so on real voices it dominates the error budget.
 *
 * Its stated benefits both turned out to be poor trades. Isolated single-frame
 * outliers — which the median rejects perfectly — are 0.265% of real frames,
 * against the ~10.95 percentage points of mis-colouring the median's delay
 * causes: roughly 40 frames damaged per 1 repaired. And for flicker, hysteresis
 * on the note name alone (`features/pitch-visualization/lib/noteStabilizer`)
 * reaches 2.14 flips/sec against this smoother's 3.62, at zero accuracy cost.
 *
 * If a future change makes smoothing look attractive again, measure it against
 * the real corpus before wiring it in, not against synthetic tones.
 */

const MEDIAN_WINDOW = 3;
const EMA_ALPHA = 0.6;
/** a jump larger than this is a real leap, not jitter — snap instead of glide */
const SNAP_SEMITONES = 2;

export interface PitchSmoother {
  /** feed a raw MIDI value, get the display/scoring value */
  push(midi: number): number;
  reset(): void;
  readonly value: number | null;
}

/**
 * Median-of-3 (kills isolated octave blips) followed by an EMA (kills the
 * remaining tremor). Deliberately snaps rather than glides across big
 * intervals, so leaping to a new note doesn't smear through the notes between.
 *
 * Behaviour is byte-for-byte what shipped; see the module comment for why it no
 * longer ships.
 */
export function createPitchSmoother(): PitchSmoother {
  const recent: number[] = [];
  let smoothed: number | null = null;

  return {
    push(midi) {
      recent.push(midi);
      if (recent.length > MEDIAN_WINDOW) recent.shift();
      const med = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
      smoothed =
        smoothed === null || Math.abs(med - smoothed) > SNAP_SEMITONES
          ? med
          : smoothed + EMA_ALPHA * (med - smoothed);
      return smoothed;
    },

    reset() {
      recent.length = 0;
      smoothed = null;
    },

    get value() {
      return smoothed;
    },
  };
}
