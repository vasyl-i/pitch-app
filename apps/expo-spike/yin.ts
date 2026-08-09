// YIN pitch detection, same algorithm as the web prototype's AudioWorklet
// (apps/web-prototype/pitch-worklet.js). Kept dependency-free so it can move
// to packages/core in phase 4 and be shared by both app shells.

export interface YinResult {
  frequency: number | null;
  rms: number;
  /** wall-clock ms spent inside the detector, for the latency report */
  computeMs: number;
}

const THRESHOLD = 0.15;
const MIN_FREQ = 70; // low male vocal range
// Silence gate. Deliberately low: the simulator's Mac-mic path delivers much
// quieter samples than a phone mic (ambient measured ~0.008 rms there with a
// 0.01 gate, which swallowed real humming).
const RMS_GATE = 0.002;

export function yinPitch(buffer: Float32Array, sampleRate: number): YinResult {
  const t0 = performance.now();

  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) sumSquares += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSquares / buffer.length);
  if (rms < RMS_GATE) {
    return { frequency: null, rms, computeMs: performance.now() - t0 };
  }

  const maxLag = Math.min(buffer.length - 1, Math.floor(sampleRate / MIN_FREQ));

  const diff = new Float32Array(maxLag);
  for (let tau = 1; tau < maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - maxLag; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmnd = new Float32Array(maxLag);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxLag; tau++) {
    runningSum += diff[tau];
    cmnd[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = 2; tau < maxLag; tau++) {
    if (cmnd[tau] < THRESHOLD) {
      while (tau + 1 < maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate === -1) {
    return { frequency: null, rms, computeMs: performance.now() - t0 };
  }

  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < maxLag - 1) {
    const s0 = cmnd[tauEstimate - 1];
    const s1 = cmnd[tauEstimate];
    const s2 = cmnd[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      const adjustment = (s2 - s0) / denom;
      if (Number.isFinite(adjustment)) betterTau = tauEstimate + adjustment;
    }
  }

  return {
    frequency: sampleRate / betterTau,
    rms,
    computeMs: performance.now() - t0,
  };
}
