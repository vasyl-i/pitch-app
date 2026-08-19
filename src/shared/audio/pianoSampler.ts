/**
 * Piano sampler backed by Salamander Grand Piano samples.
 *
 * Loads one sample every 3 semitones (C, D#, F#, A per octave) and uses the
 * AudioBufferSourceNode `detune` param to pitch-shift for notes in between.
 * This keeps the asset footprint small (~2 MB) while sounding natural.
 */
import type { AudioContext as RNAudioContext } from 'react-native-audio-api';
import { audioContext } from './toneBus';

/* ---------- static require map (metro needs literal paths) ---------- */

const SAMPLE_ASSETS: Record<number, number> = {
  36: require('../../../assets/piano/C2.mp3'),
  39: require('../../../assets/piano/Ds2.mp3'),
  42: require('../../../assets/piano/Fs2.mp3'),
  45: require('../../../assets/piano/A2.mp3'),
  48: require('../../../assets/piano/C3.mp3'),
  51: require('../../../assets/piano/Ds3.mp3'),
  54: require('../../../assets/piano/Fs3.mp3'),
  57: require('../../../assets/piano/A3.mp3'),
  60: require('../../../assets/piano/C4.mp3'),
  63: require('../../../assets/piano/Ds4.mp3'),
  66: require('../../../assets/piano/Fs4.mp3'),
  69: require('../../../assets/piano/A4.mp3'),
  72: require('../../../assets/piano/C5.mp3'),
  75: require('../../../assets/piano/Ds5.mp3'),
  78: require('../../../assets/piano/Fs5.mp3'),
  81: require('../../../assets/piano/A5.mp3'),
  84: require('../../../assets/piano/C6.mp3'),
};

/** Sorted MIDI values that have a real sample. */
const SAMPLE_MIDIS = Object.keys(SAMPLE_ASSETS).map(Number).sort((a, b) => a - b);

/* ---------- buffer cache ---------- */

type AudioBuffer = Awaited<ReturnType<RNAudioContext['decodeAudioData']>>;

const bufferCache = new Map<number, AudioBuffer>();
let preloadPromise: Promise<void> | null = null;

/**
 * Find the nearest sampled MIDI note and the cents offset to detune.
 * Positive cents = pitch up from the sample.
 */
function nearest(midi: number): { sampleMidi: number; detuneCents: number } {
  let best = SAMPLE_MIDIS[0];
  let bestDist = Math.abs(midi - best);
  for (const s of SAMPLE_MIDIS) {
    const d = Math.abs(midi - s);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return { sampleMidi: best, detuneCents: (midi - best) * 100 };
}

async function loadSample(midi: number): Promise<AudioBuffer> {
  const cached = bufferCache.get(midi);
  if (cached) return cached;

  const ctx = audioContext();
  const asset = SAMPLE_ASSETS[midi];
  const buffer = await ctx.decodeAudioData(asset);
  bufferCache.set(midi, buffer);
  return buffer;
}

/** Pre-decode all samples so first note plays instantly. */
export async function preloadPianoSamples(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(SAMPLE_MIDIS.map(loadSample)).then(() => {});
  return preloadPromise;
}

export function isPianoReady(): boolean {
  return bufferCache.size === SAMPLE_MIDIS.length;
}

export interface PianoVoice {
  source: ReturnType<RNAudioContext['createBufferSource']>;
  stopAt: number;
}

/**
 * Schedule a piano note. Returns the source node so the caller can stop it.
 * If the sample isn't loaded yet, falls back to loading on demand (may cause
 * a tiny delay on the very first play).
 */
export function schedulePianoNote(
  midi: number,
  at: number,
  duration: number,
  volume: number,
  attack: number,
  release: number,
): PianoVoice | null {
  const { sampleMidi, detuneCents } = nearest(midi);
  const buffer = bufferCache.get(sampleMidi);

  if (!buffer) {
    // Sample not loaded yet — kick off async load; note will be silent this time
    loadSample(sampleMidi);
    return null;
  }

  const ctx = audioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  if (detuneCents !== 0) {
    source.detune.value = detuneCents;
  }

  // Salamander samples are recorded at a low level; boost to match oscillator loudness.
  const boostedVolume = volume * 3.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(boostedVolume, at + attack);
  gain.gain.setValueAtTime(boostedVolume, at + duration - release);
  gain.gain.linearRampToValueAtTime(0, at + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
  source.stop(at + duration);

  return { source, stopAt: at + duration };
}
