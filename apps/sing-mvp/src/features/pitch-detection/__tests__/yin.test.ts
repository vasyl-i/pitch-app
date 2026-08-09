/**
 * YIN accuracy regression suite.
 *
 * Every budget here is a *measured* value from the audit
 * (docs/PITCH_ENGINE_AUDIT.md), padded for headroom — not an aspiration. A
 * failure means detection accuracy moved, which is exactly the class of
 * regression that previously could only be caught by ear.
 *
 * The two documented failure modes (below MIN_RELIABLE_F0, above
 * MAX_RELIABLE_F0) are asserted too. Pinning known-bad behaviour keeps the
 * declared operating range honest: if someone later fixes the high end, these
 * tests fail loudly and the constants must be updated with it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  yinPitch,
  MIN_RELIABLE_F0,
  MAX_RELIABLE_F0,
  isReliableF0,
  CLARITY_MIN_RELIABLE,
} from '../lib/yin';
import {
  ANALYSIS_RATE,
  WINDOW,
  HOP,
  CHROMATIC,
  MAJOR_SCALE,
  MINOR_SCALE,
  MAJOR_ARPEGGIO,
  INTERVAL_JUMPS,
  centsErrorOctaveAgnostic,
  forEachFrame,
  midiToHz,
  octaveError,
  phrase,
  tone,
  whisper,
  silence,
} from './fixtures/signals';

/** the timbre most like a sung vowel, used wherever a test isn't about timbre */
const VOICE = { harmonics: 12, rolloff: 0.65, noiseLevel: 0.03 } as const;
const SEC = (s: number) => Math.round(s * ANALYSIS_RATE);

/**
 * Accuracy budget as a function of pitch, in cents.
 *
 * Accuracy is *not* flat across the range, and pretending otherwise would
 * either hide a real regression at the bottom of the range or force a
 * uselessly loose bound at the top. Resolution falls as pitch rises: at the
 * 11.025kHz analysis rate a note has samples-per-period ≈ 11025/f0, so the
 * parabolic interpolation has progressively less to work with — measured
 * 0.6¢ at C4 (85 samples/period), 2.4¢ at C5 (21), 5.4¢ at G5 (14) and 12.7¢
 * at B5 (11), before the hard sub-harmonic failure past MAX_RELIABLE_F0.
 *
 * Budgets are ~2x the measured value, so ordinary noise passes and a genuine
 * regression fails. Everything here stays far inside the 25¢ band the app's
 * note classification calls "near-perfect", which is what makes the whole
 * declared range musically usable.
 */
function centsBudget(hz: number): number {
  if (hz <= 300) return 3;
  if (hz <= 550) return 6;
  if (hz <= 800) return 12;
  return 25;
}

interface Measured {
  frames: number;
  voiced: number;
  meanAbsCents: number;
  maxAbsCents: number;
  octaveErrors: number;
  minClarity: number;
}

function measure(signal: Float32Array, expectedHz: number | null): Measured {
  const cents: number[] = [];
  const clarities: number[] = [];
  let frames = 0;
  let voiced = 0;
  let octaveErrors = 0;

  forEachFrame(signal, (w) => {
    frames++;
    const r = yinPitch(w, ANALYSIS_RATE);
    if (r.frequency === null) return;
    voiced++;
    clarities.push(r.clarity);
    if (expectedHz !== null) {
      if (octaveError(r.frequency, expectedHz) !== 0) octaveErrors++;
      cents.push(Math.abs(centsErrorOctaveAgnostic(r.frequency, expectedHz)));
    }
  }, WINDOW, HOP);

  return {
    frames,
    voiced,
    meanAbsCents: cents.length ? cents.reduce((a, b) => a + b, 0) / cents.length : NaN,
    maxAbsCents: cents.length ? Math.max(...cents) : NaN,
    octaveErrors,
    minClarity: clarities.length ? Math.min(...clarities) : NaN,
  };
}

/* ------------------------------------------------------------------ *
 * Core accuracy across the declared operating range                   *
 * ------------------------------------------------------------------ */

test('tracks the full singing range inside its pitch-dependent budget, with no octave errors', () => {
  // C2..B5 — every pitch a user of this app plausibly sings
  for (const midi of [36, 40, 45, 48, 52, 57, 60, 64, 67, 72, 76, 79, 83]) {
    const hz = midiToHz(midi);
    const budget = centsBudget(hz);
    const m = measure(tone(hz, SEC(0.8), ANALYSIS_RATE, VOICE), hz);
    assert.equal(m.voiced, m.frames, `midi ${midi}: every frame must be voiced`);
    assert.equal(m.octaveErrors, 0, `midi ${midi}: no octave errors`);
    assert.ok(m.meanAbsCents < budget, `midi ${midi} (${hz.toFixed(0)}Hz): ${m.meanAbsCents.toFixed(2)}¢ exceeds ${budget}¢`);
  }
});

test('accuracy degrades monotonically with pitch, and stays musically usable throughout', () => {
  // documents the resolution curve rather than asserting a single number: the
  // top of the range is ~20x less precise than the middle, which is why the
  // budget above is banded — and why vocal-range detection refuses anything
  // beyond MAX_RELIABLE_F0 outright.
  const errorAt = (midi: number) => measure(tone(midiToHz(midi), SEC(0.6), ANALYSIS_RATE, VOICE), midiToHz(midi)).meanAbsCents;
  const mid = errorAt(60); // C4
  const high = errorAt(79); // G5
  const top = errorAt(83); // B5

  assert.ok(mid < high, `C4 (${mid.toFixed(2)}¢) should beat G5 (${high.toFixed(2)}¢)`);
  assert.ok(high < top, `G5 (${high.toFixed(2)}¢) should beat B5 (${top.toFixed(2)}¢)`);
  // even the worst case is comfortably inside the app's "near-perfect" band
  assert.ok(top < 25, `B5 error ${top.toFixed(2)}¢ would no longer read as in tune`);
});

test('is near-exact in the heart of the vocal range (measured ≤1.5¢, budget 4¢)', () => {
  for (const midi of [48, 55, 60, 64, 67]) {
    const hz = midiToHz(midi);
    const m = measure(tone(hz, SEC(0.8), ANALYSIS_RATE, VOICE), hz);
    assert.ok(m.meanAbsCents < 4, `midi ${midi}: ${m.meanAbsCents.toFixed(2)}¢`);
  }
});

test('a pure sine is tracked as accurately as a harmonic-rich voice', () => {
  const hz = midiToHz(57); // A3
  const sine = measure(tone(hz, SEC(0.8), ANALYSIS_RATE, { harmonics: 1 }), hz);
  assert.equal(sine.octaveErrors, 0);
  assert.ok(sine.meanAbsCents < 4, `${sine.meanAbsCents.toFixed(2)}¢`);
});

/* ------------------------------------------------------------------ *
 * Timbre robustness — the octave-error stress set                     *
 * ------------------------------------------------------------------ */

test('no octave errors across bright, dull, breathy or weak-fundamental timbres', () => {
  const timbres = [
    { name: 'bright', harmonics: 16, rolloff: 0.85 },
    { name: 'normal', harmonics: 12, rolloff: 0.65 },
    { name: 'dull', harmonics: 6, rolloff: 0.35 },
    { name: 'breathy', harmonics: 8, rolloff: 0.5, noiseLevel: 0.4 },
    { name: 'breathy+bright', harmonics: 16, rolloff: 0.85, noiseLevel: 0.35 },
  ];
  for (const { name, ...opts } of timbres) {
    for (const midi of [45, 52, 60, 69, 74]) {
      const hz = midiToHz(midi);
      const m = measure(tone(hz, SEC(0.5), ANALYSIS_RATE, opts), hz);
      assert.equal(m.octaveErrors, 0, `${name} @ midi ${midi}: ${m.octaveErrors} octave errors`);
    }
  }
});

test('a suppressed fundamental does not push detection an octave up', () => {
  // the "missing f0" case: small speakers and some voices radiate almost no
  // energy at the fundamental, leaving the 2nd harmonic the loudest partial
  for (const midi of [50, 57, 62]) {
    const hz = midiToHz(midi);
    const sig = tone(hz, SEC(0.5), ANALYSIS_RATE, { harmonics: 10, rolloff: 0.7 });
    const fundamental = tone(hz, SEC(0.5), ANALYSIS_RATE, { harmonics: 1, amplitude: 0.3 });
    for (let i = 0; i < sig.length; i++) sig[i] -= 0.85 * fundamental[i];
    const m = measure(sig, hz);
    assert.equal(m.octaveErrors, 0, `midi ${midi}`);
  }
});

/* ------------------------------------------------------------------ *
 * Declared operating range — including its known failures             *
 * ------------------------------------------------------------------ */

test('MIN_RELIABLE_F0 marks where low-end accuracy actually degrades', () => {
  const at55 = measure(tone(55, SEC(0.8), ANALYSIS_RATE, VOICE), 55);
  const atMin = measure(tone(MIN_RELIABLE_F0, SEC(0.8), ANALYSIS_RATE, VOICE), MIN_RELIABLE_F0);

  // still detected below the band — it degrades, it does not drop out
  assert.equal(at55.voiced, at55.frames);
  assert.ok(at55.meanAbsCents > 5, `55Hz should be visibly degraded, got ${at55.meanAbsCents.toFixed(2)}¢`);
  // and is an order of magnitude better at the declared floor
  assert.ok(atMin.meanAbsCents < 1, `${MIN_RELIABLE_F0}Hz should be near-exact, got ${atMin.meanAbsCents.toFixed(2)}¢`);
});

test('MAX_RELIABLE_F0 marks a hard sub-harmonic failure, not a soft one', () => {
  // just inside the band: correct
  const inside = measure(tone(988, SEC(0.5), ANALYSIS_RATE, VOICE), 988);
  assert.equal(inside.octaveErrors, 0, 'B5 must still be correct');
  assert.ok(inside.meanAbsCents < 25, `B5 error ${inside.meanAbsCents.toFixed(2)}¢`);

  // above it: locks onto twice the period and reports exactly one octave low.
  // Pinned deliberately — see the note at the top of this file.
  for (const hz of [1047, 1175, 1319]) {
    const m = measure(tone(hz, SEC(0.4), ANALYSIS_RATE, VOICE), hz);
    assert.ok(m.octaveErrors > 0, `${hz}Hz is expected to fail; if this passes, update MAX_RELIABLE_F0`);
  }
  assert.ok(MAX_RELIABLE_F0 > 988 && MAX_RELIABLE_F0 < 1047, 'the declared ceiling must sit between the last good and first bad note');
});

test('isReliableF0 agrees with the declared band', () => {
  assert.equal(isReliableF0(MIN_RELIABLE_F0), true);
  assert.equal(isReliableF0(MAX_RELIABLE_F0), true);
  assert.equal(isReliableF0(55), false);
  assert.equal(isReliableF0(1047), false);
});

/* ------------------------------------------------------------------ *
 * Voiced / unvoiced discrimination                                    *
 * ------------------------------------------------------------------ */

test('silence, whisper and room noise never produce a pitch', () => {
  for (const [name, sig] of [
    ['silence', silence(SEC(0.5))],
    ['whisper', whisper(SEC(0.5), 0.15)],
    ['loud whisper', whisper(SEC(0.5), 0.4)],
    ['quiet room noise', whisper(SEC(0.5), 0.02)],
  ] as const) {
    const m = measure(sig, null);
    assert.equal(m.voiced, 0, `${name} produced ${m.voiced} voiced frames`);
  }
});

test('quiet singing is still detected, down to the documented RMS gate', () => {
  const hz = midiToHz(57);
  for (const amplitude of [0.5, 0.05, 0.008, 0.004]) {
    const m = measure(tone(hz, SEC(0.5), ANALYSIS_RATE, { ...VOICE, amplitude }), hz);
    assert.equal(m.voiced, m.frames, `amplitude ${amplitude} dropped frames`);
    assert.ok(m.meanAbsCents < 4, `amplitude ${amplitude}: ${m.meanAbsCents.toFixed(2)}¢`);
  }
  // below the gate, nothing is reported rather than noise being tracked
  const belowGate = measure(tone(hz, SEC(0.5), ANALYSIS_RATE, { ...VOICE, amplitude: 0.0015 }), hz);
  assert.equal(belowGate.voiced, 0);
});

/* ------------------------------------------------------------------ *
 * Clarity — what it can and cannot tell apart                         *
 * ------------------------------------------------------------------ */

test('clarity separates clean from very breathy singing', () => {
  const clean = measure(tone(220, SEC(0.5), ANALYSIS_RATE, VOICE), 220);
  const veryBreathy = measure(tone(220, SEC(0.5), ANALYSIS_RATE, { harmonics: 8, rolloff: 0.5, noiseLevel: 0.8 }), 220);

  assert.ok(clean.minClarity >= CLARITY_MIN_RELIABLE, `clean voice clarity ${clean.minClarity.toFixed(2)} must clear the reliability bar`);
  assert.ok(veryBreathy.minClarity < CLARITY_MIN_RELIABLE, `very breathy clarity ${veryBreathy.minClarity.toFixed(2)} must fall below it`);
});

test('clarity CANNOT separate a music mix from a voice — the gate must not be trusted for that', () => {
  // This is the measurement that retired an incorrect assumption: two call
  // sites gated on clarity hoping to reject speaker bleed. A polyphonic mix
  // is as periodic as a vowel, so no threshold can work. If this test ever
  // fails, the anti-bleed strategy could be revisited.
  const voiceClarity = measure(tone(220, SEC(0.5), ANALYSIS_RATE, VOICE), null).minClarity;
  const chord = (() => {
    const a = tone(130.8, SEC(0.5), ANALYSIS_RATE, { harmonics: 8, amplitude: 0.25 });
    const b = tone(329.6, SEC(0.5), ANALYSIS_RATE, { harmonics: 6, amplitude: 0.15 });
    const c = tone(392, SEC(0.5), ANALYSIS_RATE, { harmonics: 6, amplitude: 0.15 });
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i] + c[i];
    return out;
  })();
  const mixClarity = measure(chord, null).minClarity;

  assert.ok(mixClarity > CLARITY_MIN_RELIABLE, `a chord scores ${mixClarity.toFixed(2)} — clarity gating cannot reject it`);
  assert.ok(Math.abs(mixClarity - voiceClarity) < 0.15, 'chord and voice clarity are not separable');
});

/* ------------------------------------------------------------------ *
 * DC / rumble immunity                                                *
 * ------------------------------------------------------------------ */

test('a DC offset neither shifts pitch nor inflates the reported level', () => {
  const hz = 220;
  const clean = yinPitch(tone(hz, WINDOW, ANALYSIS_RATE, VOICE), ANALYSIS_RATE);
  for (const dcOffset of [0.05, 0.15, 0.3]) {
    const biased = yinPitch(tone(hz, WINDOW, ANALYSIS_RATE, { ...VOICE, dcOffset }), ANALYSIS_RATE);
    assert.ok(biased.frequency !== null);
    assert.ok(Math.abs(centsErrorOctaveAgnostic(biased.frequency!, hz)) < 4, `pitch moved at DC ${dcOffset}`);
    // the level is AC-coupled, so a large bias must not read as a louder room
    const inflation = biased.rms / clean.rms - 1;
    assert.ok(Math.abs(inflation) < 0.05, `DC ${dcOffset} inflated rms by ${(inflation * 100).toFixed(0)}%`);
  }
});

test('a DC-only signal is not mistaken for sound', () => {
  const dc = new Float32Array(WINDOW).fill(0.4);
  const r = yinPitch(dc, ANALYSIS_RATE);
  assert.equal(r.frequency, null);
  assert.ok(r.rms < 0.01, `constant signal reported rms ${r.rms}`);
});

/* ------------------------------------------------------------------ *
 * Musical material                                                    *
 * ------------------------------------------------------------------ */

/** Median absolute cents error per note, grading only the steady middle. */
function gradePhrase(tonic: number, offsets: readonly number[], opts: Record<string, unknown>) {
  const { signal, notes } = phrase(tonic, offsets, { ...VOICE, ...opts });
  let octaveErrors = 0;
  const medians: number[] = [];

  for (const n of notes) {
    const hz = midiToHz(n.midi);
    const from = n.start + Math.round(n.length * 0.25);
    const to = n.start + Math.round(n.length * 0.75);
    const cents: number[] = [];
    let bad = 0;
    let total = 0;
    for (let s = from; s + WINDOW <= to; s += HOP) {
      const r = yinPitch(signal.subarray(s, s + WINDOW), ANALYSIS_RATE);
      if (r.frequency === null) continue;
      total++;
      if (octaveError(r.frequency, hz) !== 0) bad++;
      cents.push(Math.abs(centsErrorOctaveAgnostic(r.frequency, hz)));
    }
    assert.ok(cents.length > 0, `note at midi ${n.midi} produced no usable frames`);
    if (total > 0 && bad / total > 0.5) octaveErrors++;
    medians.push([...cents].sort((a, b) => a - b)[Math.floor(cents.length / 2)]);
  }

  // the phrase is held to the budget of its highest note, since that is the
  // hardest one in it
  const budget = centsBudget(Math.max(...notes.map((n) => midiToHz(n.midi))));
  return { notes: notes.length, octaveErrors, worstMedian: Math.max(...medians), budget };
}

test('chromatic, major, minor, arpeggio and interval-jump material all track in tune', () => {
  const material = [
    ['chromatic C4', 60, CHROMATIC, { noteSec: 0.4 }],
    ['major scale C4', 60, MAJOR_SCALE, { noteSec: 0.5 }],
    ['minor scale A3', 57, MINOR_SCALE, { noteSec: 0.5 }],
    ['major arpeggio C4', 60, MAJOR_ARPEGGIO, { noteSec: 0.5 }],
    ['interval jumps C4', 60, INTERVAL_JUMPS, { noteSec: 0.5 }],
  ] as const;

  for (const [name, tonic, offsets, opts] of material) {
    const r = gradePhrase(tonic, offsets, opts);
    assert.equal(r.octaveErrors, 0, `${name}: ${r.octaveErrors} notes an octave off`);
    assert.ok(r.worstMedian < r.budget, `${name}: worst note ${r.worstMedian.toFixed(2)}¢ over ${r.budget}¢`);
  }
});

test('phrasing extremes — slow legato and fast staccato — are both tracked', () => {
  const legato = gradePhrase(60, MAJOR_SCALE, { noteSec: 1.2, gapSec: 0 });
  assert.equal(legato.octaveErrors, 0);
  assert.ok(legato.worstMedian < legato.budget, `legato ${legato.worstMedian.toFixed(2)}¢`);

  // 120ms notes: shorter than this and the 46ms window plus hop can't place a
  // steady frame inside a note at all
  const staccato = gradePhrase(60, MAJOR_SCALE, { noteSec: 0.12, gapSec: 0.06 });
  assert.equal(staccato.octaveErrors, 0);
  assert.ok(staccato.worstMedian < staccato.budget, `staccato ${staccato.worstMedian.toFixed(2)}¢`);
});

test('male and female tessituras are both tracked, each within its own budget', () => {
  // not "equally well" — the female scale tops out at A5 (880Hz), where the
  // resolution curve above puts the floor around 10¢ no matter what
  const male = gradePhrase(45, MAJOR_SCALE, { noteSec: 0.5 }); // A2..A3
  const female = gradePhrase(69, MAJOR_SCALE, { noteSec: 0.5 }); // A4..A5
  assert.equal(male.octaveErrors, 0);
  assert.equal(female.octaveErrors, 0);
  assert.ok(male.worstMedian < male.budget, `male ${male.worstMedian.toFixed(2)}¢ over ${male.budget}¢`);
  assert.ok(female.worstMedian < female.budget, `female ${female.worstMedian.toFixed(2)}¢ over ${female.budget}¢`);
  // the low voice really is measured more precisely — worth knowing when
  // interpreting per-user statistics later
  assert.ok(male.worstMedian < female.worstMedian, 'low tessitura should measure more precisely');
});

/* ------------------------------------------------------------------ *
 * Vibrato                                                             *
 * ------------------------------------------------------------------ */

test('vibrato is tracked as pitch movement, not smeared or mistaken for noise', () => {
  const vib = tone(440, SEC(1.2), ANALYSIS_RATE, { ...VOICE, vibratoRateHz: 5.5, vibratoCents: 80 });
  const m = measure(vib, 440);

  assert.equal(m.voiced, m.frames, 'vibrato must not cause dropouts');
  assert.equal(m.octaveErrors, 0);
  // an 80¢ peak-to-peak sine swings ±40¢; mean |deviation| lands near 25¢.
  // Far below would mean the detector is averaging the vibrato away.
  assert.ok(m.meanAbsCents > 12 && m.meanAbsCents < 40, `mean deviation ${m.meanAbsCents.toFixed(1)}¢ is not vibrato-shaped`);
  assert.ok(m.maxAbsCents < 60, `peak deviation ${m.maxAbsCents.toFixed(1)}¢ exceeds the vibrato extent`);
});

/* ------------------------------------------------------------------ *
 * Cost                                                                *
 * ------------------------------------------------------------------ */

test('one analysis frame stays well inside the real-time budget', () => {
  const w = tone(220, WINDOW, ANALYSIS_RATE, VOICE);
  for (let i = 0; i < 50; i++) yinPitch(w, ANALYSIS_RATE);

  const started = process.hrtime.bigint();
  const runs = 300;
  for (let i = 0; i < runs; i++) yinPitch(w, ANALYSIS_RATE);
  const msPerFrame = Number(process.hrtime.bigint() - started) / 1e6 / runs;

  // The engine emits a frame every ~11.6ms. Measured ~0.07ms here; Hermes runs
  // this an order of magnitude slower, so the generous bound still catches an
  // accidental complexity regression (e.g. a wider search or window).
  assert.ok(msPerFrame < 1.5, `${msPerFrame.toFixed(3)}ms/frame`);
});
