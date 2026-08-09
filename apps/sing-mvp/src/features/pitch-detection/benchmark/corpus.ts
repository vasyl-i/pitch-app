/**
 * The synthetic evaluation corpus: every generated signal the benchmark
 * measures against, with its reference pitch.
 *
 * This is the one corpus whose reference is **exact by construction** rather
 * than estimated — the signal is synthesized *from* the pitch, so the pitch is
 * known and not annotated. Worth naming precisely, because the real corpus
 * (`realCorpus.ts`) is the opposite: its reference is an automatic annotation
 * produced by another pitch detector, and carries that detector's own error and
 * temporal smoothing. The two are never pooled, and this is why.
 *
 * Built as a function of sample rate rather than as a fixed array of buffers,
 * so a configuration running at a different analysis rate is measured on the
 * *same material* rather than on a resampled approximation of it. Comparing two
 * detectors on two different corpora would measure the corpora.
 *
 * The spec's required dataset — pure tones, chromatic and diatonic scales,
 * interval jumps, male and female tessituras, quiet and loud singing, noisy
 * recordings — is covered here synthetically. Synthesis cannot fake glottal
 * fry, room reverberation, consonant transients or a real microphone's noise
 * floor; those belong to the real corpus. What is here is the part that can be
 * made exact.
 */
import {
  CHROMATIC,
  INTERVAL_JUMPS,
  MAJOR_ARPEGGIO,
  MAJOR_SCALE,
  MINOR_SCALE,
  type NoteEvent,
  chordMix,
  midiToHz,
  phrase,
  pitchStep,
  silence,
  tone,
  whisper,
} from './signals';
import { bandIdFor } from './bands';
import type { BenchmarkCase, PitchReference } from './types';

/** the timbre closest to a sung vowel; used wherever a case is not about timbre */
export const VOICE = { harmonics: 12, rolloff: 0.65, noiseLevel: 0.03 } as const;

/** case ids the report singles out for the voice-versus-music comparison */
export const VOICE_REFERENCE_CASE = 'confidence-clean-voice';
export const MUSIC_REFERENCE_CASE = 'confidence-chord-mix';
/** genuine singing that a clarity gate would be at risk of rejecting */
export const BREATHY_REFERENCE_CASES = ['confidence-breathy', 'confidence-very-breathy'];

const steady = (hz: number): PitchReference => () => hz;
const silent = (): PitchReference => () => null;
const unscored = (): PitchReference => () => 'excluded';

/**
 * Reference pitch for rendered musical material.
 *
 * A window is scored only when it lies entirely inside one sounding note. A
 * window straddling a note change contains two pitches, so every possible
 * answer is wrong and counting it would charge the detector for the corpus's
 * own construction. Transitions are measured deliberately instead, by the
 * settling cases.
 */
function phraseReference(notes: NoteEvent[]): PitchReference {
  return (start, end) => {
    for (const n of notes) {
      if (start >= n.start && end <= n.start + n.length) return midiToHz(n.midi);
    }
    const touchesNote = notes.some((n) => start < n.start + n.length && end > n.start);
    return touchesNote ? 'excluded' : null;
  };
}

/** Reference pitch either side of a pitch step; the splice window is excluded. */
function stepReference(stepSample: number, fromHz: number, toHz: number): PitchReference {
  return (start, end) => {
    if (end <= stepSample) return fromHz;
    if (start >= stepSample) return toHz;
    return 'excluded';
  };
}

/**
 * A harmonic stack with its fundamental largely cancelled — small speakers and
 * some voices radiate almost nothing at f0, leaving the 2nd harmonic the
 * loudest partial. The classic way to trick a period-based detector an octave
 * up.
 */
function suppressedFundamental(hz: number, sampleCount: number, rate: number): Float32Array {
  const full = tone(hz, sampleCount, rate, { harmonics: 10, rolloff: 0.7 });
  const f0 = tone(hz, sampleCount, rate, { harmonics: 1, amplitude: 0.3 });
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) out[i] = full[i] - 0.85 * f0[i];
  return out;
}

/* ------------------------------------------------------------------ *
 * Corpus                                                              *
 * ------------------------------------------------------------------ */

/** MIDI notes swept for accuracy, chosen to populate every band. */
const ACCURACY_MIDI = [
  33, 34, 35, // below the declared floor
  36, 40, 43, 45, 47, // low
  48, 50, 52, 55, 57, 60, 62, 64, // core
  65, 67, 69, 72, 74, 76, // upper-mid
  77, 79, 81, 83, // high
];

/** above the declared ceiling: measured to confirm the failure is still there */
const ABOVE_RANGE_MIDI = [84, 86, 88];

export function buildCorpus(sampleRate: number): BenchmarkCase[] {
  const sec = (s: number) => Math.round(s * sampleRate);
  const cases: BenchmarkCase[] = [];

  /* -- accuracy sweep ------------------------------------------------ */
  for (const midi of ACCURACY_MIDI) {
    const hz = midiToHz(midi);
    cases.push({
      id: `accuracy-midi-${midi}`,
      label: `sustained tone, MIDI ${midi} (${hz.toFixed(1)}Hz)`,
      group: 'accuracy',
      bandId: bandIdFor(hz),
      signal: tone(hz, sec(0.5), sampleRate, VOICE),
      reference: steady(hz),
    });
  }

  for (const midi of ABOVE_RANGE_MIDI) {
    const hz = midiToHz(midi);
    cases.push({
      id: `accuracy-midi-${midi}`,
      label: `sustained tone above the ceiling, MIDI ${midi} (${hz.toFixed(0)}Hz)`,
      group: 'accuracy',
      bandId: bandIdFor(hz),
      signal: tone(hz, sec(0.4), sampleRate, VOICE),
      reference: steady(hz),
      expectOctaveFailure: true,
    });
  }

  /* -- timbre stress (the octave-error set) -------------------------- */
  const timbres = [
    { name: 'bright', opts: { harmonics: 16, rolloff: 0.85 } },
    { name: 'dull', opts: { harmonics: 6, rolloff: 0.35 } },
    { name: 'breathy', opts: { harmonics: 8, rolloff: 0.5, noiseLevel: 0.4 } },
    { name: 'breathy-bright', opts: { harmonics: 16, rolloff: 0.85, noiseLevel: 0.35 } },
  ];
  for (const { name, opts } of timbres) {
    for (const midi of [45, 52, 60, 69, 74]) {
      const hz = midiToHz(midi);
      cases.push({
        id: `octave-${name}-${midi}`,
        label: `${name} timbre, MIDI ${midi}`,
        group: 'octave',
        bandId: bandIdFor(hz),
        signal: tone(hz, sec(0.4), sampleRate, opts),
        reference: steady(hz),
      });
    }
  }
  for (const midi of [50, 57, 62]) {
    const hz = midiToHz(midi);
    cases.push({
      id: `octave-suppressed-f0-${midi}`,
      label: `suppressed fundamental, MIDI ${midi}`,
      group: 'octave',
      bandId: bandIdFor(hz),
      signal: suppressedFundamental(hz, sec(0.4), sampleRate),
      reference: steady(hz),
    });
  }

  /* -- voicing ------------------------------------------------------- */
  const unvoiced: [string, Float32Array][] = [
    ['silence', silence(sec(0.5))],
    ['whisper', whisper(sec(0.5), 0.15)],
    ['loud-whisper', whisper(sec(0.5), 0.4)],
    ['room-noise', whisper(sec(0.5), 0.02)],
  ];
  for (const [name, signal] of unvoiced) {
    cases.push({
      id: `voicing-${name}`,
      label: `${name} — no pitch exists`,
      group: 'voicing',
      signal,
      reference: silent(),
      expectUnvoiced: true,
    });
  }

  const quietHz = midiToHz(57);
  for (const amplitude of [0.5, 0.05, 0.008, 0.004]) {
    cases.push({
      id: `voicing-amplitude-${amplitude}`,
      label: `sung at amplitude ${amplitude}`,
      group: 'voicing',
      bandId: bandIdFor(quietHz),
      signal: tone(quietHz, sec(0.4), sampleRate, { ...VOICE, amplitude }),
      reference: steady(quietHz),
    });
  }
  cases.push({
    id: 'voicing-below-gate',
    label: 'below the RMS gate — must stay silent',
    group: 'voicing',
    signal: tone(quietHz, sec(0.4), sampleRate, { ...VOICE, amplitude: 0.0015 }),
    reference: silent(),
    expectUnvoiced: true,
  });

  /* -- stability ----------------------------------------------------- */
  for (const midi of [48, 60, 69, 79]) {
    const hz = midiToHz(midi);
    cases.push({
      id: `stability-steady-${midi}`,
      label: `1.5s steady tone, MIDI ${midi}`,
      group: 'stability',
      bandId: bandIdFor(hz),
      signal: tone(hz, sec(1.5), sampleRate, VOICE),
      reference: steady(hz),
    });
  }
  cases.push({
    id: 'stability-vibrato',
    label: 'vibrato 5.5Hz / 80¢ — movement that must survive',
    group: 'stability',
    bandId: bandIdFor(440),
    signal: tone(440, sec(1.2), sampleRate, { ...VOICE, vibratoRateHz: 5.5, vibratoCents: 80 }),
    reference: steady(440),
    expectPitchMovement: true,
  });

  /* -- confidence ---------------------------------------------------- */
  cases.push({
    id: VOICE_REFERENCE_CASE,
    label: 'clean sustained vowel',
    group: 'confidence',
    bandId: bandIdFor(220),
    signal: tone(220, sec(0.5), sampleRate, VOICE),
    reference: steady(220),
  });
  cases.push({
    id: 'confidence-breathy',
    label: 'breathy voice (40% noise)',
    group: 'confidence',
    bandId: bandIdFor(220),
    signal: tone(220, sec(0.5), sampleRate, { harmonics: 8, rolloff: 0.5, noiseLevel: 0.4 }),
    reference: steady(220),
  });
  cases.push({
    id: 'confidence-very-breathy',
    label: 'very breathy voice (80% noise)',
    group: 'confidence',
    bandId: bandIdFor(220),
    signal: tone(220, sec(0.5), sampleRate, { harmonics: 8, rolloff: 0.5, noiseLevel: 0.8 }),
    reference: steady(220),
  });
  cases.push({
    id: MUSIC_REFERENCE_CASE,
    label: 'polyphonic mix (speaker bleed)',
    group: 'confidence',
    // no reference pitch: the "right" f0 of a chord is not a question the detector
    // is being asked. Only its confidence values are wanted here.
    signal: chordMix(261.6, sec(0.5), sampleRate),
    reference: unscored(),
  });

  /* -- musical material ---------------------------------------------- */
  const material = [
    { id: 'chromatic-c4', label: 'chromatic scale from C4', tonic: 60, offsets: CHROMATIC, opts: { noteSec: 0.4 } },
    { id: 'major-c4', label: 'major scale from C4', tonic: 60, offsets: MAJOR_SCALE, opts: { noteSec: 0.5 } },
    { id: 'minor-a3', label: 'minor scale from A3', tonic: 57, offsets: MINOR_SCALE, opts: { noteSec: 0.5 } },
    { id: 'arpeggio-c4', label: 'major arpeggio from C4', tonic: 60, offsets: MAJOR_ARPEGGIO, opts: { noteSec: 0.5 } },
    { id: 'jumps-c4', label: 'interval jumps from C4', tonic: 60, offsets: INTERVAL_JUMPS, opts: { noteSec: 0.5 } },
    { id: 'legato-c4', label: 'slow legato major scale', tonic: 60, offsets: MAJOR_SCALE, opts: { noteSec: 1.2, gapSec: 0 } },
    { id: 'staccato-c4', label: '120ms staccato major scale', tonic: 60, offsets: MAJOR_SCALE, opts: { noteSec: 0.12, gapSec: 0.06 } },
    { id: 'male-a2', label: 'male tessitura, major scale from A2', tonic: 45, offsets: MAJOR_SCALE, opts: { noteSec: 0.5 } },
    { id: 'female-a4', label: 'female tessitura, major scale from A4', tonic: 69, offsets: MAJOR_SCALE, opts: { noteSec: 0.5 } },
  ];
  for (const m of material) {
    const rendered = phrase(m.tonic, m.offsets, { ...VOICE, ...m.opts, sampleRate });
    const highest = Math.max(...rendered.notes.map((n) => midiToHz(n.midi)));
    cases.push({
      id: `material-${m.id}`,
      label: m.label,
      group: 'material',
      // a phrase is held to the band of its hardest (highest) note
      bandId: bandIdFor(highest),
      signal: rendered.signal,
      reference: phraseReference(rendered.notes),
    });
  }

  /* -- latency (pitch steps) ----------------------------------------- */
  const steps = [
    { id: 'semitone-c4', from: midiToHz(60), to: midiToHz(61) },
    { id: 'fifth-c4', from: midiToHz(60), to: midiToHz(67) },
    { id: 'octave-c4', from: midiToHz(60), to: midiToHz(72) },
    { id: 'fifth-down-a4', from: midiToHz(69), to: midiToHz(62) },
    { id: 'octave-a2', from: midiToHz(45), to: midiToHz(57) },
    { id: 'semitone-a4', from: midiToHz(69), to: midiToHz(70) },
  ];
  for (const s of steps) {
    const rendered = pitchStep(s.from, s.to, 0.4, sampleRate, VOICE);
    cases.push({
      id: `latency-${s.id}`,
      label: `pitch step ${s.from.toFixed(0)}Hz → ${s.to.toFixed(0)}Hz`,
      group: 'latency',
      bandId: bandIdFor(s.to),
      signal: rendered.signal,
      reference: stepReference(rendered.stepSample, s.from, s.to),
      expectPitchMovement: true,
      steps: [{ atSample: rendered.stepSample, fromHz: s.from, toHz: s.to }],
    });
  }

  return cases;
}
