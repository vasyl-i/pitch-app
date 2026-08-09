/**
 * Turning a stream of voiced pitch frames into discrete sung *notes*.
 *
 * The karaoke-style display and the take score both work on notes, not raw
 * frames: a note is pitch held within a semitone-ish band for at least
 * `MIN_NOTE_SEC`. That requirement is also the strongest "is this actually
 * the singer?" filter available here — speaker bleed and room noise wander
 * in pitch and rarely sustain, so they mostly never become notes at all.
 */
import { median } from '@/shared/lib/music';

/** note accuracy → display band: lime / white / red */
export type NoteClass = 'perfect' | 'good' | 'off';

/** cents thresholds behind the bands: ≤25¢ near-perfect, ≤70¢ middling, beyond = off/wrong note */
const PERFECT_NOTE_CENTS = 25;
const GOOD_NOTE_CENTS = 70;

export function noteClass(cents: number): NoteClass {
  const a = Math.abs(cents);
  return a <= PERFECT_NOTE_CENTS ? 'perfect' : a <= GOOD_NOTE_CENTS ? 'good' : 'off';
}

export interface SungNote {
  t0: number;
  t1: number;
  /** the in-key note this one snaps to (nearest scale tone as concrete MIDI) */
  laneMidi: number;
  /** median signed cents to that scale tone over the note's life */
  medianCents: number;
  cls: NoteClass;
}

/** a note still being sung — same shape, judged on what's accumulated so far */
export type FormingNote = SungNote;

/**
 * Pitch must hold this long to count as a note.
 *
 * Was 180ms, which silently discarded ordinary singing: a sixteenth note at
 * 120bpm lasts 125ms, so quick syllables never became notes at all (measured:
 * 0 of 8 shown at 140ms/note). 100ms still spans ~8 analysis frames at the
 * engine's 11.6ms hop — enough for a stable median — and restores those notes
 * in full.
 *
 * This threshold was also doing double duty as a defence against the backing
 * track leaking in on a loudspeaker, and it is weaker at that now. That was
 * always the wrong job for it: sustained chord bleed comfortably outlasts any
 * plausible minimum, so the value only ever filtered transients. Bleed is
 * held off by the vocal-range filter and, properly, by headphones — and
 * dropping the singer's own notes is the worse failure of the two.
 */
export const MIN_NOTE_SEC = 0.1;
/** a longer silence than this closes the current note */
export const GAP_SEC = 0.15;
/** drifting further than this from the note's median starts a new note */
export const SAME_NOTE_SEMITONES = 0.8;

/**
 * Segmentation thresholds. Exposed as options — with the constants above as
 * defaults — so they can be swept in tests rather than argued about: the
 * shortest note the app can show is a direct consequence of `minNoteSec`, and
 * that number trades visible-note yield against how much of the backing track
 * leaks in on a loudspeaker.
 */
export interface NoteAggregatorOptions {
  minNoteSec?: number;
  gapSec?: number;
  sameNoteSemitones?: number;
}

interface Accumulator {
  t0: number;
  t1: number;
  midis: number[];
  cents: number[];
}

function snapshot(acc: Accumulator, minNoteSec: number): SungNote | null {
  if (acc.t1 - acc.t0 < minNoteSec) return null;
  const medianMidi = median(acc.midis);
  const medianCents = Math.round(median(acc.cents));
  return {
    t0: acc.t0,
    t1: acc.t1,
    laneMidi: Math.round(medianMidi - medianCents / 100),
    medianCents,
    cls: noteClass(medianCents),
  };
}

export interface NoteAggregator {
  /** feed a voiced frame; returns a completed note when this frame closes one */
  push(t: number, midi: number, cents: number): SungNote | null;
  /** feed silence; returns the note it closed, if any */
  silence(t: number): SungNote | null;
  /** close and return whatever is in progress (end of take) */
  flush(): SungNote | null;
  /** the note currently forming, or null */
  forming(): FormingNote | null;
}

export function createNoteAggregator(options: NoteAggregatorOptions = {}): NoteAggregator {
  const {
    minNoteSec = MIN_NOTE_SEC,
    gapSec = GAP_SEC,
    sameNoteSemitones = SAME_NOTE_SEMITONES,
  } = options;
  let acc: Accumulator | null = null;

  const close = (): SungNote | null => {
    const done = acc ? snapshot(acc, minNoteSec) : null;
    acc = null;
    return done;
  };

  return {
    push(t, midi, cents) {
      if (acc && (t - acc.t1 > gapSec || Math.abs(midi - median(acc.midis)) > sameNoteSemitones)) {
        const done = close();
        acc = { t0: t, t1: t, midis: [midi], cents: [cents] };
        return done;
      }
      if (!acc) {
        acc = { t0: t, t1: t, midis: [midi], cents: [cents] };
        return null;
      }
      acc.t1 = t;
      acc.midis.push(midi);
      acc.cents.push(cents);
      return null;
    },

    silence(t) {
      if (acc && t - acc.t1 > gapSec) return close();
      return null;
    },

    flush: close,

    forming() {
      return acc ? snapshot(acc, minNoteSec) : null;
    },
  };
}

export interface TakeScore {
  /** 0–100: staying in key, weighted by how precisely notes sat on pitch */
  score: number;
  /** fraction of sung time on an in-key note, 0..1 */
  inKeyFraction: number;
  /** duration-weighted average absolute deviation, cents */
  avgCents: number;
  notes: number;
}

/** the end-of-take summary, duration-weighted so long notes count for more */
export function scoreNotes(notes: readonly SungNote[]): TakeScore | null {
  if (notes.length === 0) return null;
  let total = 0;
  let inKey = 0;
  let centsSum = 0;
  for (const n of notes) {
    const dur = n.t1 - n.t0;
    total += dur;
    if (n.cls !== 'off') inKey += dur;
    centsSum += Math.abs(n.medianCents) * dur;
  }
  if (total <= 0) return null;
  const inKeyFraction = inKey / total;
  const avgCents = centsSum / total;
  const precision = Math.max(0, 1 - avgCents / 120);
  return {
    score: Math.round(100 * (0.7 * inKeyFraction + 0.3 * precision)),
    inKeyFraction,
    avgCents: Math.round(avgCents),
    notes: notes.length,
  };
}
