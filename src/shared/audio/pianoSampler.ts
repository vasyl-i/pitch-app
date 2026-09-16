/**
 * Sample-based instrument engine.
 *
 * Loads one sample every 3 semitones (C, D#, F#, A per octave) and uses the
 * AudioBufferSourceNode `detune` param to pitch-shift for notes in between.
 * This keeps the asset footprint small while sounding natural.
 *
 * Supports multiple instruments — each is a set of 17 MP3 samples sharing the
 * same note layout (C2–C6 at 3-semitone intervals).
 */
import type { AudioContext as RNAudioContext } from 'react-native-audio-api';
import { audioContext } from './toneBus';
import type { SoundType } from './soundStore';

/* ---------- static require maps (metro needs literal paths) ---------- */

type SampleMap = Record<number, number>;

const PIANO_ASSETS: SampleMap = {
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

// Harp sounds best one octave higher: map each sample 12 semitones below
// its natural pitch so the detune logic shifts it up by an octave.
const HARP_ASSETS: SampleMap = {
  24: require('../../../assets/harp/C2.mp3'),
  27: require('../../../assets/harp/Ds2.mp3'),
  30: require('../../../assets/harp/Fs2.mp3'),
  33: require('../../../assets/harp/A2.mp3'),
  36: require('../../../assets/harp/C3.mp3'),
  39: require('../../../assets/harp/Ds3.mp3'),
  42: require('../../../assets/harp/Fs3.mp3'),
  45: require('../../../assets/harp/A3.mp3'),
  48: require('../../../assets/harp/C4.mp3'),
  51: require('../../../assets/harp/Ds4.mp3'),
  54: require('../../../assets/harp/Fs4.mp3'),
  57: require('../../../assets/harp/A4.mp3'),
  60: require('../../../assets/harp/C5.mp3'),
  63: require('../../../assets/harp/Ds5.mp3'),
  66: require('../../../assets/harp/Fs5.mp3'),
  69: require('../../../assets/harp/A5.mp3'),
  72: require('../../../assets/harp/C6.mp3'),
};

// Organ sounds best one octave higher: map each sample 12 semitones below
// its natural pitch so the detune logic shifts it up by an octave.
const ORGAN_ASSETS: SampleMap = {
  24: require('../../../assets/organ/C2.mp3'),
  27: require('../../../assets/organ/Ds2.mp3'),
  30: require('../../../assets/organ/Fs2.mp3'),
  33: require('../../../assets/organ/A2.mp3'),
  36: require('../../../assets/organ/C3.mp3'),
  39: require('../../../assets/organ/Ds3.mp3'),
  42: require('../../../assets/organ/Fs3.mp3'),
  45: require('../../../assets/organ/A3.mp3'),
  48: require('../../../assets/organ/C4.mp3'),
  51: require('../../../assets/organ/Ds4.mp3'),
  54: require('../../../assets/organ/Fs4.mp3'),
  57: require('../../../assets/organ/A4.mp3'),
  60: require('../../../assets/organ/C5.mp3'),
  63: require('../../../assets/organ/Ds5.mp3'),
  66: require('../../../assets/organ/Fs5.mp3'),
  69: require('../../../assets/organ/A5.mp3'),
  72: require('../../../assets/organ/C6.mp3'),
};

// Music box sounds best one octave higher: map each sample 12 semitones below
// its natural pitch so the detune logic shifts it up by an octave.
const MUSICBOX_ASSETS: SampleMap = {
  24: require('../../../assets/musicbox/C2.mp3'),
  27: require('../../../assets/musicbox/Ds2.mp3'),
  30: require('../../../assets/musicbox/Fs2.mp3'),
  33: require('../../../assets/musicbox/A2.mp3'),
  36: require('../../../assets/musicbox/C3.mp3'),
  39: require('../../../assets/musicbox/Ds3.mp3'),
  42: require('../../../assets/musicbox/Fs3.mp3'),
  45: require('../../../assets/musicbox/A3.mp3'),
  48: require('../../../assets/musicbox/C4.mp3'),
  51: require('../../../assets/musicbox/Ds4.mp3'),
  54: require('../../../assets/musicbox/Fs4.mp3'),
  57: require('../../../assets/musicbox/A4.mp3'),
  60: require('../../../assets/musicbox/C5.mp3'),
  63: require('../../../assets/musicbox/Ds5.mp3'),
  66: require('../../../assets/musicbox/Fs5.mp3'),
  69: require('../../../assets/musicbox/A5.mp3'),
  72: require('../../../assets/musicbox/C6.mp3'),
};

const ELECTROBOX_ASSETS: SampleMap = {
  36: require('../../../assets/electrobox/C2.mp3'),
  39: require('../../../assets/electrobox/Ds2.mp3'),
  42: require('../../../assets/electrobox/Fs2.mp3'),
  45: require('../../../assets/electrobox/A2.mp3'),
  48: require('../../../assets/electrobox/C3.mp3'),
  51: require('../../../assets/electrobox/Ds3.mp3'),
  54: require('../../../assets/electrobox/Fs3.mp3'),
  57: require('../../../assets/electrobox/A3.mp3'),
  60: require('../../../assets/electrobox/C4.mp3'),
  63: require('../../../assets/electrobox/Ds4.mp3'),
  66: require('../../../assets/electrobox/Fs4.mp3'),
  69: require('../../../assets/electrobox/A4.mp3'),
  72: require('../../../assets/electrobox/C5.mp3'),
  75: require('../../../assets/electrobox/Ds5.mp3'),
  78: require('../../../assets/electrobox/Fs5.mp3'),
  81: require('../../../assets/electrobox/A5.mp3'),
  84: require('../../../assets/electrobox/C6.mp3'),
};

// Saw sounds best one octave higher: map each sample 12 semitones below
// its natural pitch so the detune logic shifts it up by an octave.
const SAW_ASSETS: SampleMap = {
  24: require('../../../assets/saw/C2.mp3'),
  27: require('../../../assets/saw/Ds2.mp3'),
  30: require('../../../assets/saw/Fs2.mp3'),
  33: require('../../../assets/saw/A2.mp3'),
  36: require('../../../assets/saw/C3.mp3'),
  39: require('../../../assets/saw/Ds3.mp3'),
  42: require('../../../assets/saw/Fs3.mp3'),
  45: require('../../../assets/saw/A3.mp3'),
  48: require('../../../assets/saw/C4.mp3'),
  51: require('../../../assets/saw/Ds4.mp3'),
  54: require('../../../assets/saw/Fs4.mp3'),
  57: require('../../../assets/saw/A4.mp3'),
  60: require('../../../assets/saw/C5.mp3'),
  63: require('../../../assets/saw/Ds5.mp3'),
  66: require('../../../assets/saw/Fs5.mp3'),
  69: require('../../../assets/saw/A5.mp3'),
  72: require('../../../assets/saw/C6.mp3'),
};

// Simple sounds best one octave higher: map each sample 12 semitones below
// its natural pitch so the detune logic shifts it up by an octave.
const SIMPLE_ASSETS: SampleMap = {
  24: require('../../../assets/simple/C2.mp3'),
  27: require('../../../assets/simple/Ds2.mp3'),
  30: require('../../../assets/simple/Fs2.mp3'),
  33: require('../../../assets/simple/A2.mp3'),
  36: require('../../../assets/simple/C3.mp3'),
  39: require('../../../assets/simple/Ds3.mp3'),
  42: require('../../../assets/simple/Fs3.mp3'),
  45: require('../../../assets/simple/A3.mp3'),
  48: require('../../../assets/simple/C4.mp3'),
  51: require('../../../assets/simple/Ds4.mp3'),
  54: require('../../../assets/simple/Fs4.mp3'),
  57: require('../../../assets/simple/A4.mp3'),
  60: require('../../../assets/simple/C5.mp3'),
  63: require('../../../assets/simple/Ds5.mp3'),
  66: require('../../../assets/simple/Fs5.mp3'),
  69: require('../../../assets/simple/A5.mp3'),
  72: require('../../../assets/simple/C6.mp3'),
};

const INSTRUMENT_ASSETS: Record<SoundType, SampleMap> = {
  piano: PIANO_ASSETS,
  harp: HARP_ASSETS,
  organ: ORGAN_ASSETS,
  musicbox: MUSICBOX_ASSETS,
  electrobox: ELECTROBOX_ASSETS,
  saw: SAW_ASSETS,
  simple: SIMPLE_ASSETS,
};

/** Sorted MIDI values per instrument. */
const INSTRUMENT_MIDIS: Record<SoundType, number[]> = Object.fromEntries(
  Object.entries(INSTRUMENT_ASSETS).map(([key, assets]) => [
    key,
    Object.keys(assets).map(Number).sort((a, b) => a - b),
  ]),
) as Record<SoundType, number[]>;

/* ---------- buffer cache ---------- */

type AudioBuffer = Awaited<ReturnType<RNAudioContext['decodeAudioData']>>;

/** Cache keyed by "instrument:midi" */
const bufferCache = new Map<string, AudioBuffer>();
const preloadPromises = new Map<SoundType, Promise<void>>();

function cacheKey(instrument: SoundType, midi: number): string {
  return `${instrument}:${midi}`;
}

/**
 * Find the nearest sampled MIDI note and the cents offset to detune.
 * Positive cents = pitch up from the sample.
 */
function nearest(midi: number, instrument: SoundType): { sampleMidi: number; detuneCents: number } {
  const midis = INSTRUMENT_MIDIS[instrument];
  let best = midis[0];
  let bestDist = Math.abs(midi - best);
  for (const s of midis) {
    const d = Math.abs(midi - s);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return { sampleMidi: best, detuneCents: (midi - best) * 100 };
}

async function loadSample(instrument: SoundType, midi: number): Promise<AudioBuffer> {
  const key = cacheKey(instrument, midi);
  const cached = bufferCache.get(key);
  if (cached) return cached;

  const ctx = audioContext();
  const assets = INSTRUMENT_ASSETS[instrument];
  const asset = assets[midi];
  const buffer = await ctx.decodeAudioData(asset);
  bufferCache.set(key, buffer);
  return buffer;
}

/** Pre-decode all samples for an instrument so first note plays instantly. */
export async function preloadSamples(instrument: SoundType): Promise<void> {
  const existing = preloadPromises.get(instrument);
  if (existing) return existing;
  const midis = INSTRUMENT_MIDIS[instrument];
  const promise = Promise.all(midis.map((m) => loadSample(instrument, m))).then(() => {});
  preloadPromises.set(instrument, promise);
  return promise;
}

/** Legacy alias for piano preload. */
export async function preloadPianoSamples(): Promise<void> {
  return preloadSamples('piano');
}

export function isInstrumentReady(instrument: SoundType): boolean {
  return INSTRUMENT_MIDIS[instrument].every((m) => bufferCache.has(cacheKey(instrument, m)));
}

export function isPianoReady(): boolean {
  return isInstrumentReady('piano');
}

export interface PianoVoice {
  source: ReturnType<RNAudioContext['createBufferSource']>;
  stopAt: number;
}

/**
 * Schedule a sampled note. Returns the source node so the caller can stop it.
 * If the sample isn't loaded yet, falls back to loading on demand.
 */
export function schedulePianoNote(
  midi: number,
  at: number,
  duration: number,
  volume: number,
  attack: number,
  release: number,
  instrument: SoundType = 'piano',
): PianoVoice | null {
  const { sampleMidi, detuneCents } = nearest(midi, instrument);
  const key = cacheKey(instrument, sampleMidi);
  const buffer = bufferCache.get(key);

  if (!buffer) {
    // Sample not loaded yet — kick off async load; note will be silent this time
    loadSample(instrument, sampleMidi);
    return null;
  }

  const ctx = audioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  if (detuneCents !== 0) {
    source.detune.value = detuneCents;
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + attack);
  gain.gain.setValueAtTime(volume, at + duration - release);
  gain.gain.linearRampToValueAtTime(0, at + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
  source.stop(at + duration);

  return { source, stopAt: at + duration };
}
