/**
 * On-device song-key detection for an uploaded instrumental.
 *
 * Same approach as the reference implementation in
 * `scripts/analyze_chord_key.py` (chroma → Krumhansl-Schmuckler), scaled to
 * run in JS on a phone: the decoded audio is crudely low-passed and
 * decimated, per-semitone energies (C3–B6) are measured with Goertzel on
 * ~200 windows spread across the track, log-compressed into a 12-bin
 * chroma vector, and correlated against the 24 rotated K-S key profiles.
 *
 * TODO: the chord *timeline* is still not produced here — grading falls back
 * to the key scale until the chord-segmentation half of the Python script is
 * ported or a backend runs it.
 */
import { decodeAudioData } from 'react-native-audio-api';
import { PITCH_CLASSES } from '@/shared/lib/music';
import type { DetectedKey } from '../model/types';

/* Krumhansl-Schmuckler tonal-hierarchy profiles */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** analysis band: C3..B6 — melody/harmony range, above rumble, below hiss */
const LOW_MIDI = 48;
const SEMITONES = 48;
/** decimation factor before analysis (with a box low-pass) */
const DECIMATE = 4;
/** analysis window after decimation (~186ms at 11.025kHz) */
const WINDOW = 2048;
/** cap on analysed windows, spread evenly across the track */
const MAX_FRAMES = 200;

function goertzelPower(samples: Float32Array, start: number, length: number, freq: number, sampleRate: number): number {
  const coeff = 2 * Math.cos((2 * Math.PI * freq) / sampleRate);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = start; i < start + length; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let dA = 0;
  let dB = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - meanA;
    const xb = b[i] - meanB;
    num += xa * xb;
    dA += xa * xa;
    dB += xb * xb;
  }
  return dA > 0 && dB > 0 ? num / Math.sqrt(dA * dB) : 0;
}

/** chroma of decoded, decimated audio: summed log-compressed semitone energies */
function chromaOf(samples: Float32Array, sampleRate: number): number[] {
  const chroma = new Array<number>(12).fill(0);
  const hop = Math.max(WINDOW, Math.floor((samples.length - WINDOW) / MAX_FRAMES));
  const freqs: number[] = [];
  for (let s = 0; s < SEMITONES; s++) freqs.push(440 * Math.pow(2, (LOW_MIDI + s - 69) / 12));

  for (let start = 0; start + WINDOW <= samples.length; start += hop) {
    for (let s = 0; s < SEMITONES; s++) {
      const power = goertzelPower(samples, start, WINDOW, freqs[s], sampleRate);
      chroma[(LOW_MIDI + s) % 12] += Math.log1p(1000 * power);
    }
  }
  return chroma;
}

export async function detectKey(uri: string): Promise<DetectedKey> {
  const buffer = await decodeAudioData(uri);
  const raw = buffer.getChannelData(0);

  // box-average decimation: a crude low-pass, enough for a key estimate
  const decimated = new Float32Array(Math.floor(raw.length / DECIMATE));
  for (let i = 0; i < decimated.length; i++) {
    const j = i * DECIMATE;
    decimated[i] = (raw[j] + raw[j + 1] + raw[j + 2] + raw[j + 3]) / DECIMATE;
  }

  const chroma = chromaOf(decimated, buffer.sampleRate / DECIMATE);

  let best = { score: -Infinity, root: 0, minor: false };
  for (let root = 0; root < 12; root++) {
    const rotated = chroma.map((_, i) => chroma[(i + root) % 12]);
    const maj = pearson(rotated, MAJOR_PROFILE);
    const min = pearson(rotated, MINOR_PROFILE);
    if (maj > best.score) best = { score: maj, root, minor: false };
    if (min > best.score) best = { score: min, root, minor: true };
  }

  return {
    keyName: `${PITCH_CLASSES[best.root]} ${best.minor ? 'minor' : 'major'}`,
    chords: [],
  };
}
