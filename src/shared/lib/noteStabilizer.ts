/**
 * Display stabilization for note names and note-quantized indicators.
 *
 * ## What this is, and what it deliberately is not
 *
 * This is a **presentation** filter. It answers one question — "which note name
 * should be on screen right now" — and it answers it from the pitch it is given
 * without ever altering that pitch. Cents, MIDI values, frequencies and
 * everything derived from them pass through the app untouched; scoring, note
 * analysis and statistics never see this module at all.
 *
 * That separation is the point. The pipeline previously ran
 * `createPitchSmoother` (a median-of-3 followed by an EMA) *before* both scoring
 * and rendering, which meant a filter whose only purpose was visual calm was
 * also deciding what the singer's score was.
 *
 * ## Why hysteresis rather than smoothing
 *
 * Flicker is not a pitch problem, it is a *rounding* problem. A singer sitting
 * near a note boundary produces a pitch that crosses it repeatedly; rounding
 * that to a note name flips the display back and forth even when the pitch
 * estimate is perfectly accurate. Smoothing the pitch attacks the wrong term:
 * it reduces the crossings by adding lag, and lag on a moving pitch is error.
 *
 * Hysteresis attacks the rounding directly. The displayed note holds until the
 * pitch has moved *past* the boundary by an extra margin, so a pitch hovering on
 * the boundary settles instead of oscillating — and because only the rounding
 * changes, nothing measurable moves.
 *
 * Measured over the VocalSet real-world corpus (docs/PITCH_SMOOTHER_ANALYSIS.md):
 *
 * | | note flips/sec | mis-coloured frames |
 * |---|---|---|
 * | raw pitch, plain rounding | 4.44 | 3.78% |
 * | raw pitch + 0.15 semitone hysteresis | 2.56 | 3.78% |
 * | raw pitch + 0.25 semitone hysteresis | **2.14** | **3.78%** |
 * | `createPitchSmoother` (the old path) | 3.62 | 20.11% |
 *
 * Better flicker reduction than the smoother achieved, at no accuracy cost at
 * all — the accuracy column is unchanged by construction, because the pitch is
 * unchanged.
 */

/**
 * Extra distance past the note boundary, in semitones, that the pitch must
 * travel before the displayed note changes.
 *
 * 0.25 is the measured best of the two values tried (see the table above). The
 * cost of raising it is that the displayed note can lag the sung pitch by up to
 * `0.5 + hysteresis` semitones while the singer sits between two notes; at 0.25
 * that is three quarters of a semitone, and only while they are genuinely
 * between notes. Raising it further trades legibility for stillness.
 */
export const DEFAULT_NOTE_HYSTERESIS_SEMITONES = 0.25;

export interface NoteStabilizer {
  /**
   * Feed the raw continuous MIDI value (null when nothing is being sung) and
   * get back the integer MIDI note to display, or null.
   *
   * Idempotent: pushing the same value twice returns the same note and leaves
   * the stabilizer in the same state. React may render more than once for a
   * single update, and a display filter must not drift because of it.
   */
  push(midi: number | null): number | null;
  reset(): void;
  /** the note currently displayed, without advancing anything */
  readonly note: number | null;
}

export function createNoteStabilizer(
  hysteresisSemitones: number = DEFAULT_NOTE_HYSTERESIS_SEMITONES
): NoteStabilizer {
  let current: number | null = null;

  return {
    push(midi) {
      if (midi === null) {
        // Silence resets the display rather than holding the last note: a stale
        // note left on screen after the singer stops reads as a detection, and
        // the pitch path already reports silence honestly.
        current = null;
        return null;
      }
      if (current === null || Math.abs(midi - current) > 0.5 + hysteresisSemitones) {
        current = Math.round(midi);
      }
      return current;
    },

    reset() {
      current = null;
    },

    get note() {
      return current;
    },
  };
}
