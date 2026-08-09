/**
 * A minimal RIFF/WAVE reader.
 *
 * Written rather than depended on because the alternative is adding an npm
 * package to a React Native app in order to read files that only ever get read
 * on a developer's laptop. The format subset here is exactly what the
 * ingestion script emits (`afconvert`-produced PCM) plus the handful of
 * variants a phone or a DAW realistically hands you.
 *
 * Deliberately strict: an unsupported encoding throws with what it found
 * instead of returning plausible-looking silence. A benchmark that quietly
 * measures a misparsed file is worse than one that refuses to run.
 */

export interface WavAudio {
  /** interleaved channels collapsed to mono, −1..1 */
  samples: Float32Array;
  sampleRateHz: number;
  channels: number;
  bitsPerSample: number;
  durationSec: number;
}

const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;

function fourCc(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/**
 * Parse a WAVE buffer into mono float samples.
 *
 * Channels are averaged rather than taking the left one: a singer recorded to
 * a stereo file is usually centred, and dropping a channel would throw away
 * 3dB of signal-to-noise for no reason.
 */
export function decodeWav(buffer: ArrayBuffer): WavAudio {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || fourCc(view, 0) !== 'RIFF' || fourCc(view, 8) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }

  let format = -1;
  let channels = 0;
  let sampleRateHz = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  // walk the chunk list; anything unrecognised (LIST, fact, cue) is skipped
  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const id = fourCc(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRateHz = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
      if (format === FORMAT_EXTENSIBLE && size >= 40) {
        // the real format lives in the GUID's first two bytes
        format = view.getUint16(body + 24, true);
      }
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, buffer.byteLength - body);
    }

    offset = body + size + (size % 2); // chunks are word-aligned
  }

  if (dataOffset < 0) throw new Error('WAVE file has no data chunk');
  if (channels < 1) throw new Error('WAVE file declares no channels');

  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * channels));
  const samples = new Float32Array(frameCount);

  const readSample = (at: number): number => {
    if (format === FORMAT_FLOAT && bitsPerSample === 32) return view.getFloat32(at, true);
    if (format === FORMAT_PCM) {
      if (bitsPerSample === 16) return view.getInt16(at, true) / 32768;
      if (bitsPerSample === 24) {
        // little-endian 24-bit two's complement, sign-extended
        const raw = view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16);
        return (raw & 0x800000 ? raw - 0x1000000 : raw) / 8388608;
      }
      if (bitsPerSample === 32) return view.getInt32(at, true) / 2147483648;
      if (bitsPerSample === 8) return view.getUint8(at) / 128 - 1; // 8-bit WAV is unsigned
    }
    throw new Error(`unsupported WAVE encoding: format ${format}, ${bitsPerSample}-bit`);
  };

  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    const base = dataOffset + frame * bytesPerSample * channels;
    for (let c = 0; c < channels; c++) sum += readSample(base + c * bytesPerSample);
    samples[frame] = sum / channels;
  }

  return {
    samples,
    sampleRateHz,
    channels,
    bitsPerSample,
    durationSec: sampleRateHz > 0 ? frameCount / sampleRateHz : 0,
  };
}

/**
 * Encode mono float samples as 16-bit PCM WAVE.
 *
 * Only used to build test fixtures — the corpus itself is never written by the
 * harness. Kept here so the reader and writer stay in one place and can be
 * round-trip tested against each other.
 */
export function encodeWav(samples: Float32Array, sampleRateHz: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, FORMAT_PCM, true);
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, sampleRateHz * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }
  return buffer;
}
