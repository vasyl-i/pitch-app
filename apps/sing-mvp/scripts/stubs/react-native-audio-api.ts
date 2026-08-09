/**
 * Minimal stand-in for the native audio module so the playback pipeline can be
 * driven under `node --test`. Mapped in by scripts/ts-resolver.mjs; not bundled
 * into the app.
 */

let clock = 0;

/** Move the fake audio clock, in seconds. */
export function __advanceAudioClock(seconds: number): void {
  clock += seconds;
}

export function __resetAudioClock(): void {
  clock = 0;
}

  class FakeParam {
  value = 0;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
}

class FakeNode {
  connect(): void {}
  disconnect(): void {}
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  start(at: number): void {
    this.startedAt = at;
  }
  stop(at: number): void {
    this.stoppedAt = at;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

/**
 * Every oscillator scheduled during a test, so a test can assert that
 * something was actually *sounded* — not merely that a timeline ran.
 */
export const __oscillators: FakeOscillator[] = [];

export function __resetOscillators(): void {
  __oscillators.length = 0;
}

export class AudioContext {
  destination = new FakeNode();
  get currentTime(): number {
    return clock;
  }
  get state(): string {
    return 'running';
  }
  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    __oscillators.push(osc);
    return osc;
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  async resume(): Promise<void> {}
}

/** Mirrors the one process-wide iOS audio session. */
export const __session = { active: false, activations: 0, deactivations: 0 };

export function __resetSession(): void {
  __session.active = false;
  __session.activations = 0;
  __session.deactivations = 0;
}

export const AudioManager = {
  setAudioSessionOptions(): void {},
  async setAudioSessionActivity(active: boolean): Promise<void> {
    __session.active = active;
    if (active) __session.activations++;
    else __session.deactivations++;
  },
  observeAudioInterruptions(): void {},
  addSystemEventListener() {
    return { remove(): void {} };
  },
  async requestRecordingPermissions(): Promise<string> {
    return 'Granted';
  },
};

type ReadyCallback = (event: {
  buffer: { getChannelData(ch: number): Float32Array; sampleRate: number };
  when: number;
}) => void;

/** Every recorder built during a test, so the test can push audio into them. */
export const __recorders: AudioRecorder[] = [];

export function __resetRecorders(): void {
  __recorders.length = 0;
}

export class AudioRecorder {
  ready: ReadyCallback | null = null;
  running = false;
  private elapsed = 0;

  constructor() {
    __recorders.push(this);
  }

  onAudioReady(_opts: unknown, cb: ReadyCallback): void {
    this.ready = cb;
  }
  onError(): void {}
  clearOnAudioReady(): void {
    this.ready = null;
  }
  clearOnError(): void {}
  async start(): Promise<void> {
    this.running = true;
  }
  async stop(): Promise<void> {
    this.running = false;
  }

  /** Push one buffer of a steady tone (or silence when `freq` is 0). */
  __emit(freq: number, amplitude: number, length = 512, sampleRate = 44100): void {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const t = this.elapsed + i / sampleRate;
      data[i] = freq > 0 ? Math.sin(2 * Math.PI * freq * t) * amplitude : 0;
    }
    this.elapsed += length / sampleRate;
    this.ready?.({
      buffer: { getChannelData: () => data, sampleRate },
      when: this.elapsed,
    });
  }
}
