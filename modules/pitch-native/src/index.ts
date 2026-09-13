import PitchNative from './PitchNativeModule';

export interface NativePitchResult {
  frequency: number | null;
  rms: number;
  clarity: number;
  clipped: boolean;
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
