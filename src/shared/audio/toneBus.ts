/**
 * Shared audio output: one AudioContext for the whole app, plus a small
 * sample-based voice scheduler.
 *
 * Before this existed, ear training and staff practice each built their own
 * AudioContext and their own copy of the same triangle-oscillator ADSR. Two
 * contexts contend for the same output session, and the melody player closed
 * its context to silence in-flight notes — a trick that only worked because
 * nothing else shared it.
 *
 * Here the context is shared and never closed; instead every scheduled voice
 * is tracked so a caller can cancel exactly its own notes (`ToneGroup`). That
 * preserves "stop kills pending audio" without tearing down the output for
 * everyone else.
 */
import { AudioContext } from 'react-native-audio-api';
import { trackSounding } from './referenceMonitor';
import { getSoundPrefs } from './soundStore';
import { schedulePianoNote, type PianoVoice } from './pianoSampler';

let sharedCtx: AudioContext | null = null;

/** The process-wide output context, created on first use. */
export function audioContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

/** Seconds on the audio clock. */
export function audioNow(): number {
  return audioContext().currentTime;
}

export interface ToneSpec {
  midi: number;
  /** absolute audio-clock time to begin */
  at: number;
  /** total sounding length, seconds */
  duration: number;
  /** peak gain */
  volume: number;
  /** fade-in length, seconds */
  attack?: number;
  /** fade-out length, seconds (starts this long before the end) */
  release?: number;
}

/**
 * A cancellable set of scheduled voices. Callers create one per playback unit
 * (a prompt tone, a melody run) and cancel it to silence everything it owns.
 */
export interface ToneGroup {
  schedule(spec: ToneSpec): void;
  /** stop and discard every voice this group scheduled */
  cancel(): void;
}

export interface ToneGroupOptions {
  /**
   * Whether this group's audio can reach the microphone.
   *
   * Default true: the group extends the global "speaker is busy" horizon and
   * the mic pipeline drops every frame captured while it sounds.
   *
   * Pass false *only* when the output route has been confirmed private
   * (`shared/audio/outputRoute`) — headphones mean there is no acoustic path
   * back to the mic, so gating buys nothing and would make a simultaneous
   * sing-along impossible. Passing it on a loudspeaker route lets the app's own
   * output be graded as singing, which is the exact failure the interlock
   * exists to prevent.
   */
  claimsSpeaker?: boolean;
}

interface SampleVoice { voice: PianoVoice; stopAt: number }

export function createToneGroup({ claimsSpeaker = true }: ToneGroupOptions = {}): ToneGroup {
  const ctx = audioContext();
  let voices: SampleVoice[] = [];
  // this group's contribution to the global "speaker is busy" horizon, which
  // is what keeps the mic pipeline from analysing our own output
  const sounding = claimsSpeaker ? trackSounding() : null;

  const prune = (now: number) => {
    voices = voices.filter((v) => v.stopAt > now);
  };

  return {
    schedule({ midi, at, duration, volume, attack = 0.04, release = 0.12 }) {
      const prefs = getSoundPrefs();
      const scaledVolume = volume * prefs.volume;

      const pv = schedulePianoNote(midi, at, duration, scaledVolume, attack, release, prefs.soundType);
      if (pv) {
        prune(ctx.currentTime);
        voices.push({ voice: pv, stopAt: pv.stopAt });
      }

      // extend the speaker-busy horizon, converting the audio clock to wall
      // clock at scheduling time (the two clocks are unrelated)
      sounding?.extendTo(Date.now() + (at + duration - ctx.currentTime) * 1000);
    },

    cancel() {
      const now = ctx.currentTime;
      for (const v of voices) {
        try {
          v.voice.source.stop(now);
        } catch {
          // voice had already ended
        }
      }
      voices = [];
      // the speaker falls silent now, so retract this group's horizon rather
      // than leaving the mic gated for a melody that is no longer playing
      sounding?.clear();
    },
  };
}
