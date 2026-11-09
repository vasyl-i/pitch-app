/**
 * Sing-back capture: turns raw pitch-engine frames into clean, timestamped
 * sung frames for the evaluators.
 *
 * The old implementation pushed raw YIN output straight into scoring with no
 * voice gate, so room noise counted as singing and the "live note" readout
 * disagreed with the final verdict. One pipeline (gate → frame log) feeds both,
 * which is half of the "score never changes after you stop singing" guarantee
 * (the other half is that live and final scoring run the same evaluator over
 * this log).
 *
 * The log holds **raw** detector pitch, minus the detector's stray readings:
 * a pitch outside its trusted band, or a jump of more than a few semitones
 * that the next frames don't confirm, is dropped by the jump guard (see
 * `createPitchJumpGuard`). It never alters a pitch it lets through, and a
 * confirmed leap is logged in full at the times it was sung.
 *
 * A pitch smoother used to sit between the
 * gate and the log; it was measured as the largest source of user-visible pitch
 * error on real singing and no longer exists in this path. Visual steadiness for
 * the live note name is a presentation concern, handled by the note stabilizer
 * in `features/pitch-visualization` at the point of display.
 *
 * Prompt bleed is not this module's problem: frames captured while the app was
 * sounding a prompt never reach `push` at all — the mic broker's reference
 * interlock drops them upstream. The gate's learned noise floor still survives
 * across rounds, now simply because the room doesn't change and rebuilding the
 * estimate from scratch would leave it unsettled for the first seconds of a
 * sing window.
 */
import { createPitchJumpGuard, createVoiceGate, type PitchFrame } from '@/features/pitch-detection';
import { createNoteStabilizer } from '@/shared/lib/noteStabilizer';
import { freqToMidi, midiToName } from '@/shared/lib/music';

export interface SungFrame {
  /** seconds since the sing window opened */
  t: number;
  /** raw continuous MIDI, exactly as the detector reported it */
  midi: number;
}

export interface LivePitch {
  /**
   * Display name of the note being sung right now, e.g. "A3".
   *
   * Stabilized for presentation: it holds through small excursions across a
   * note boundary so the readout does not flicker. It is derived from `midi`
   * but is not a rounding of it, and nothing scored is computed from it.
   */
  note: string | null;
  /** raw continuous MIDI, exactly as the detector reported it */
  midi: number | null;
}

export interface SingCapture {
  /** open a fresh window; clears the frame log but keeps the noise floor */
  begin(): void;
  /** stop recording frames (the gate keeps learning the room) */
  end(): void;
  /** feed every engine frame, windowed or not */
  push(frame: PitchFrame): void;
  /** frames recorded in the current window, time-ordered */
  readonly frames: SungFrame[];
  readonly live: LivePitch;
  reset(): void;
}

/** while the jump guard holds a frame back the live readout stays put, but not for longer than this */
const LIVE_HOLD_MS = 120;

export function createSingCapture(): SingCapture {
  const gate = createVoiceGate();
  const jumpGuard = createPitchJumpGuard();
  // display only — never touches `frames`, which is what scoring reads
  const displayNote = createNoteStabilizer();
  let frames: SungFrame[] = [];
  let live: LivePitch = { note: null, midi: null };
  let collecting = false;
  let openedAt = 0;
  let lastLoggedAt = 0;

  return {
    begin() {
      frames = [];
      live = { note: null, midi: null };
      displayNote.reset();
      collecting = true;
      jumpGuard.reset();
      openedAt = Date.now();
    },

    end() {
      collecting = false;
      live = { note: null, midi: null };
    },

    push(frame) {
      const now = Date.now();
      const rawMidi = frame.frequency ? freqToMidi(frame.frequency) : null;
      // fed even outside a sing window, so the noise-floor estimate keeps
      // tracking the room; every frame that gets here is already known to be
      // free of our own playback
      const isVoice = gate.accept(frame.rms, rawMidi, now);
      if (!collecting) return;

      // every voiced frame keeps the gate's continuity, held or not — as the
      // native gate does — so a soft note stays on the lower sustain bar
      if (isVoice && rawMidi !== null) gate.confirm(rawMidi, now);
      const released = jumpGuard.push(isVoice ? rawMidi : null, now);
      for (const { midi, at } of released) {
        frames.push({ t: (at - openedAt) / 1000, midi });
        lastLoggedAt = at;
      }
      const last = released[released.length - 1];
      if (last) {
        const shown = displayNote.push(last.midi);
        live = { note: shown === null ? null : midiToName(shown, 'ascii'), midi: last.midi };
      } else if (!isVoice || now - lastLoggedAt > LIVE_HOLD_MS) {
        // a frame held for confirmation leaves the readout as it was, briefly
        displayNote.push(null);
        live = { note: null, midi: null };
      }
    },

    get frames() {
      return frames;
    },

    get live() {
      return live;
    },

    reset() {
      collecting = false;
      frames = [];
      live = { note: null, midi: null };
      gate.reset();
      jumpGuard.reset();
      displayNote.reset();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Note segmentation                                                   *
 * ------------------------------------------------------------------ */

export interface SungNote {
  /** window-relative onset, seconds */
  start: number;
  /** seconds */
  duration: number;
  /** median continuous MIDI over the segment */
  midi: number;
  frameCount: number;
}

/** a new segment starts when the pitch moves this far (semitones) */
const SEGMENT_BREAK_SEMITONES = 0.8;
/** or when the voice pauses this long */
const SEGMENT_BREAK_GAP_SEC = 0.25;
/** anything shorter is a scoop/blip, not a sung note */
const MIN_NOTE_SEC = 0.15;

/**
 * Group a frame log into discrete sung notes: consecutive frames that stay on
 * one pitch, split on gaps or pitch moves. This is what lets multi-note
 * exercises (chord tones, melodies) grade "which notes did you sing" instead
 * of averaging everything into one blur.
 */
export function segmentNotes(frames: SungFrame[]): SungNote[] {
  const notes: SungNote[] = [];
  let seg: SungFrame[] = [];

  const flush = () => {
    if (seg.length === 0) return;
    const duration = seg[seg.length - 1].t - seg[0].t;
    if (duration >= MIN_NOTE_SEC) {
      const midis = seg.map((f) => f.midi).sort((a, b) => a - b);
      notes.push({
        start: seg[0].t,
        duration,
        midi: midis[Math.floor(midis.length / 2)],
        frameCount: seg.length,
      });
    }
    seg = [];
  };

  for (const frame of frames) {
    const prev = seg[seg.length - 1];
    if (prev && (frame.t - prev.t > SEGMENT_BREAK_GAP_SEC || Math.abs(frame.midi - prev.midi) > SEGMENT_BREAK_SEMITONES)) {
      flush();
    }
    seg.push(frame);
  }
  flush();
  return notes;
}
