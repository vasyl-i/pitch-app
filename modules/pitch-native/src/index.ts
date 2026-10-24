import PitchNative from './PitchNativeModule';

export interface NativePitchResult {
  frequency: number | null;
  rms: number;
  clarity: number;
  clipped: boolean;
  /** the voice gate's verdict — present only when the frame was gated */
  voiced?: boolean;
}

/** run a voice gate on the frame's result, inside the same native call */
export interface GateStep {
  gate: NativeVoiceGate;
  nowMs: number;
  /** a voiced frame also teaches the gate the sung pitch (`confirm`) */
  confirm: boolean;
}

/**
 * Native pitch processor: FIR decimation (44.1kHz → 11025Hz) + sliding
 * window + YIN detection, all in C. Drop-in replacement for the JS
 * pipeline in pitchEngine.ts.
 */
export class NativePitchProcessor {
  private id: number;
  private destroyed = false;

  constructor() {
    this.id = PitchNative.createProcessor();
  }

  /** [hasFrequency, frequency, rms, clarity, clipped, voiced], written by the native side */
  private out = new Float32Array(6);
  /** a binary built before `processSamples` existed (an OTA update) has only `processFrame` */
  private zeroCopy = typeof PitchNative.processSamples === 'function';
  private copyBuf: number[] = [];

  /**
   * The per-frame call: the recorder's Float32Array goes to C as-is, pitch is
   * detected and — given `gated` — the voice gate runs on the result, all in
   * one native call; the result comes back through a reused output array.
   */
  processSamples(samples: Float32Array, sampleRate: number, gated?: GateStep): NativePitchResult | null {
    if (this.destroyed) return null;
    const gateId = gated?.gate.nativeId ?? 0;
    if (!this.zeroCopy) return this.processSamplesSlow(samples, sampleRate, gateId ? gated : undefined);
    const o = this.out;
    if (!PitchNative.processSamples(this.id, samples, sampleRate, o, gateId, gated?.nowMs ?? 0, gated?.confirm ?? false)) {
      return null;
    }
    return {
      frequency: o[0] ? o[1] : null,
      rms: o[2],
      clarity: o[3],
      clipped: o[4] !== 0,
      ...(gateId !== 0 && { voiced: o[5] !== 0 }),
    };
  }

  /** the same, one bridge call per step — for binaries without `processSamples` */
  private processSamplesSlow(samples: Float32Array, sampleRate: number, gated?: GateStep): NativePitchResult | null {
    const buf = this.copyBuf;
    buf.length = samples.length;
    for (let i = 0; i < samples.length; i++) buf[i] = samples[i];
    const result = this.processFrame(buf, sampleRate);
    if (!result || !gated) return result;
    const midi = result.frequency ? 69 + 12 * Math.log2(result.frequency / 440) : null;
    const voiced = gated.gate.accept(result.rms, midi, gated.nowMs) && midi !== null;
    if (voiced && gated.confirm) gated.gate.confirm(midi, gated.nowMs);
    return { ...result, voiced };
  }

  processFrame(samples: number[], sampleRate: number): NativePitchResult | null {
    if (this.destroyed) return null;
    const raw = PitchNative.processFrame(this.id, samples, sampleRate);
    if (!raw) return null;
    return {
      frequency: raw.frequency ?? null,
      rms: raw.rms,
      clarity: raw.clarity,
      clipped: raw.clipped,
    };
  }

  reset(): void {
    if (!this.destroyed) PitchNative.resetProcessor(this.id);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    PitchNative.destroyProcessor(this.id);
  }
}

/**
 * Native voice gate: adaptive two-level gate with learned noise floor.
 * Same algorithm as createVoiceGate() in signal.ts, but in C.
 */
export class NativeVoiceGate {
  private id: number;
  private destroyed = false;

  /** the native handle for `processSamples`; 0 once destroyed (no gating) */
  get nativeId(): number {
    return this.destroyed ? 0 : this.id;
  }

  constructor() {
    this.id = PitchNative.createVoiceGate();
  }

  accept(rms: number, midi: number | null, nowMs: number): boolean {
    if (this.destroyed) return false;
    return PitchNative.voiceGateAccept(
      this.id,
      rms,
      midi ?? -1,
      midi !== null,
      nowMs,
    );
  }

  confirm(midi: number, nowMs: number): void {
    if (!this.destroyed) PitchNative.voiceGateConfirm(this.id, midi, nowMs);
  }

  reset(): void {
    if (!this.destroyed) PitchNative.voiceGateReset(this.id);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    PitchNative.destroyVoiceGate(this.id);
  }
}
