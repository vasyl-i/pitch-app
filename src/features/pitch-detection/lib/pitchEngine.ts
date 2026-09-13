/**
 * Microphone → pitch pipeline, framework-agnostic (no React imports).
 *
 * Wraps react-native-audio-api's AudioRecorder and delegates DSP to the
 * native C core (modules/pitch-native): FIR decimation (44.1kHz → 11025Hz),
 * sliding analysis window, and YIN pitch detection — all off the JS thread.
 *
 * Consumers throttle UI updates themselves; this emits at full cadence so a
 * future scoring feature can use every frame.
 */
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { NativePitchProcessor } from '../../../../modules/pitch-native/src';
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
  let processor: NativePitchProcessor | null = null;
  let status: PitchEngineStatus = 'idle';
  let subscriptions: { remove(): void }[] = [];
  /**
   * Whether *this* engine is the one holding the audio session active. The
   * session is process-wide, so an engine that no longer owns it must never
   * deactivate it — doing so deafens whichever recorder is live now.
   */
  let holdsSession = false;

  async function start() {
    if (status === 'running') return;

    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== 'Granted') throw new MicPermissionError(permission);

    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: options.iosMode ?? 'measurement',
      iosOptions: ['defaultToSpeaker'],
      iosAllowHaptics: true,
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
    processor = new NativePitchProcessor();

    recorder.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: HOP, channelCount: 1 }, (event) => {
      // `DIAGNOSTICS_AVAILABLE` folds to false in release, so the minifier
      // drops this timer and the record call below entirely — the production
      // path pays nothing, not even a branch on an enabled flag.
      const startedAt = DIAGNOSTICS_AVAILABLE ? Date.now() : 0;
      const chunk = event.buffer.getChannelData(0);
      const sr = event.buffer.sampleRate || SAMPLE_RATE;

      // Convert Float32Array to number[] for the native bridge
      const samples = Array.from(chunk);
      const result = processor!.processFrame(samples, sr);
      if (!result) return;

      const { frequency, rms, clarity, clipped } = result;

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
    if (processor) {
      processor.destroy();
      processor = null;
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
