/**
 * Microphone → pitch pipeline, framework-agnostic (no React imports).
 *
 * Wraps react-native-audio-api's AudioRecorder, decimates the signal 4x
 * before analysis (Hermes is too slow for full-rate YIN — measured in the
 * phase 2 spike), maintains a sliding analysis window, and emits one
 * PitchFrame per audio callback (~23ms).
 *
 * Consumers throttle UI updates themselves; this emits at full cadence so a
 * future scoring feature can use every frame.
 */
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { yinPitch } from './yin';
import { DIAGNOSTICS_AVAILABLE, recordFrame } from './diagnostics';

export interface PitchFrame {
  frequency: number | null;
  rms: number;
  /** periodicity confidence, 0..1 — see YinResult */
  clarity: number;
  /** true if any sample in this frame's raw audio hit the ceiling (distortion/scream) */
  clipped: boolean;
  /** capture timestamp, seconds since recording start */
  when: number;
}

export type PitchEngineStatus = 'idle' | 'running' | 'interrupted';

const SAMPLE_RATE = 44100;
const HOP = 512; // frames per audio callback (~12ms — halves detection latency)
const DECIMATE = 4; // analyze at 11.025kHz — 16x cheaper, fine for vocals
const WINDOW = 512; // ~46ms of decimated signal

// Anti-aliasing FIR for the 4x decimation (windowed sinc, Hamming, 24 taps,
// cutoff at the decimated Nyquist). The old boxcar average leaked aliased
// harmonics into the analysis band, degrading YIN on bright real mixes.
const FIR_TAPS = (() => {
  const N = 24;
  const fc = 0.5 / DECIMATE; // normalized cutoff
  const taps = new Float32Array(N);
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const k = n - (N - 1) / 2;
    const sinc = k === 0 ? 2 * Math.PI * fc : Math.sin(2 * Math.PI * fc * k) / k;
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    taps[n] = sinc * hamming;
    sum += taps[n];
  }
  for (let n = 0; n < N; n++) taps[n] /= sum; // unity DC gain
  return taps;
})();

export class MicPermissionError extends Error {
  constructor(status: string) {
    super(`Microphone permission ${status}`);
    this.name = 'MicPermissionError';
  }
}

export interface PitchEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly status: PitchEngineStatus;
}

/** raw sample magnitude above this is treated as clipped (distortion/scream) */
const CLIP_THRESHOLD = 0.985;

export interface PitchEngineOptions {
  /**
   * 'voiceChat' enables the OS echo canceller. Its speech-tuned processing
   * audibly mangles sustained sung tones, so 'measurement' is the default and
   * the right choice for every current feature.
   *
   * This is deliberately *not* how reference audio is kept out of the pitch
   * detector — echo cancellation is a best-effort acoustic subtraction, and
   * trading real damage to the singer's own signal for a partial defence is a
   * bad bargain. Separation is enforced exactly instead, by
   * `lib/referenceGate`. Reach for 'voiceChat' only for a genuinely
   * simultaneous sing-along over a continuous backing track, where temporal
   * separation isn't available.
   */
  iosMode?: 'measurement' | 'voiceChat';
  /**
   * The OS suspended (phone call, Siri, alarm) or restored audio input.
   * `shouldResume` mirrors the system hint for whether playback/capture is
   * expected to continue automatically; the engine reactivates the session
   * itself on 'ended' either way, but a caller may still want to show its own
   * "we're back" affordance only when the OS agrees.
   */
  onInterruption?: (phase: 'began' | 'ended', shouldResume: boolean) => void;
  /** the native recorder reported an error (e.g. route lost mid-capture) */
  onError?: (message: string) => void;
}

export function createPitchEngine(
  onFrame: (frame: PitchFrame) => void,
  options: PitchEngineOptions = {}
): PitchEngine {
  let recorder: AudioRecorder | null = null;
  let status: PitchEngineStatus = 'idle';
  let subscriptions: { remove(): void }[] = [];
  /**
   * Whether *this* engine is the one holding the audio session active. The
   * session is process-wide, so an engine that no longer owns it must never
   * deactivate it — doing so deafens whichever recorder is live now.
   */
  let holdsSession = false;

  const window = new Float32Array(WINDOW);
  let filled = 0;
  // raw-sample carry so the FIR has history across chunk boundaries
  let carry = new Float32Array(0);

  async function start() {
    if (status === 'running') return;

    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== 'Granted') throw new MicPermissionError(permission);

    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: options.iosMode ?? 'measurement',
      iosOptions: ['defaultToSpeaker'],
    });
    await AudioManager.setAudioSessionActivity(true);
    holdsSession = true;
    AudioManager.observeAudioInterruptions(true);

    const interruptionSub = AudioManager.addSystemEventListener('interruption', (event) => {
      if (event.type === 'began') {
        status = 'interrupted';
        options.onInterruption?.('began', event.shouldResume);
        return;
      }
      // the OS deactivates the session on interruption; reclaim it so
      // frames resume flowing without the caller having to restart
      AudioManager.setAudioSessionActivity(true)
        .then(() => {
          if (status === 'interrupted') status = 'running';
        })
        .catch(() => {
          // hardware may still be held by another app (e.g. an active call)
          // — leave status as 'interrupted' so the caller keeps showing its
          // recovery UI instead of assuming we're live
        });
      options.onInterruption?.('ended', event.shouldResume);
    });
    if (interruptionSub) subscriptions.push(interruptionSub);

    recorder = new AudioRecorder();
    recorder.onError((event) => options.onError?.(event.message));
    filled = 0;
    carry = new Float32Array(0);

    recorder.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: HOP, channelCount: 1 }, (event) => {
      // `DIAGNOSTICS_AVAILABLE` folds to false in release, so the minifier
      // drops this timer and the record call below entirely — the production
      // path pays nothing, not even a branch on an enabled flag.
      const startedAt = DIAGNOSTICS_AVAILABLE ? Date.now() : 0;
      const chunk = event.buffer.getChannelData(0);
      const sr = event.buffer.sampleRate || SAMPLE_RATE;

      let clipped = false;
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] >= CLIP_THRESHOLD || chunk[i] <= -CLIP_THRESHOLD) {
          clipped = true;
          break;
        }
      }

      // prepend carried samples so the FIR window never starves at the seam
      const raw = new Float32Array(carry.length + chunk.length);
      raw.set(carry, 0);
      raw.set(chunk, carry.length);

      // filtered decimation: FIR lowpass evaluated at every DECIMATE-th sample
      const nTaps = FIR_TAPS.length;
      const decLen = Math.max(0, Math.floor((raw.length - nTaps) / DECIMATE));
      const input = new Float32Array(decLen);
      for (let i = 0; i < decLen; i++) {
        let acc = 0;
        const base = i * DECIMATE;
        for (let k = 0; k < nTaps; k++) acc += FIR_TAPS[k] * raw[base + k];
        input[i] = acc;
      }
      // keep the tail that the next chunk's first outputs will need
      const consumed = decLen * DECIMATE;
      carry = raw.slice(consumed);

      // slide the analysis window left, append the new chunk at the end
      if (input.length >= WINDOW) {
        window.set(input.subarray(input.length - WINDOW));
        filled = WINDOW;
      } else {
        window.copyWithin(0, input.length);
        window.set(input, WINDOW - input.length);
        filled = Math.min(WINDOW, filled + input.length);
      }
      if (filled < WINDOW) return;

      const { frequency, rms, clarity } = yinPitch(window, sr / DECIMATE);

      if (DIAGNOSTICS_AVAILABLE) {
        const now = Date.now();
        recordFrame({
          timestamp: now,
          audioTime: event.when,
          rawFrequency: frequency,
          confidence: clarity,
          rms,
          clipped,
          processingMs: now - startedAt,
          // the audio clock counts from recording start and the wall clock
          // from the epoch, so only the *delta* between successive frames is
          // comparable; absolute latency needs a shared origin the recorder
          // does not expose. Left null rather than reported wrongly.
          latencyMs: null,
        });
      }

      onFrame({ frequency, rms, clarity, clipped, when: event.when });
    });

    await recorder.start();
    status = 'running';
  }

  async function stop() {
    for (const sub of subscriptions) sub.remove();
    subscriptions = [];
    if (recorder) {
      recorder.clearOnAudioReady();
      recorder.clearOnError();
      await recorder.stop();
      recorder = null;
    }
    // Only the engine that activated the session may deactivate it, and only
    // once. A stopped engine can be stopped again — the broker pre-empts an
    // incumbent, and that incumbent's owner then releases its own (now stale)
    // lease — and without this guard the second stop tears the shared session
    // out from under the recorder that replaced it. Playback survives that,
    // because it runs on the AudioContext, so the failure looks like a mic
    // that silently stopped existing.
    if (holdsSession) {
      holdsSession = false;
      await AudioManager.setAudioSessionActivity(false).catch(() => {
        // deactivation can fail if another session grabbed the hardware; ignore
      });
    }
    status = 'idle';
  }

  return {
    start,
    stop,
    get status() {
      return status;
    },
  };
}
