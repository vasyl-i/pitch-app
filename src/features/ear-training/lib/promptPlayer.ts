/**
 * Reliable prompt playback for ear training.
 *
 * Two failure modes made prompts silently not play before this existed:
 * the shared AudioContext can sit suspended (fresh launch, or after an OS
 * interruption), and listening-only exercises never activated the iOS audio
 * session at all — only the mic engine did, so "Major or minor?" depended on
 * some *other* feature having run first. `ensurePlaybackReady` closes both
 * holes and is awaited before any round starts, so an exercise can no longer
 * begin without working audio; failures surface as a typed error the session
 * turns into a friendly message instead of a silent round.
 *
 * Every play() returns a cancellable handle. Cancelling silences the tones
 * *and* settles the completion promise, so no lifecycle step can dangle on a
 * prompt that was cut short.
 */
import { AudioManager } from 'react-native-audio-api';
import { audioContext, audioNow, createToneGroup } from '@/shared/audio';

export class PlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaybackError';
  }
}

/** One scheduled sound in a prompt: a note when `midis` has one entry, a chord otherwise. */
export interface PromptTone {
  midis: number[];
  /** prompt-relative start, seconds */
  at: number;
  /** seconds */
  duration: number;
  /** peak gain, defaults to a comfortable reference level */
  volume?: number;
}

export interface PromptScript {
  tones: PromptTone[];
  /** total length, seconds (last tone end; precomputed so callers can show progress) */
  length: number;
}

/** Build a script from tones, computing the total length. */
export function script(tones: PromptTone[]): PromptScript {
  const length = tones.reduce((m, t) => Math.max(m, t.at + t.duration), 0);
  return { tones, length };
}

/** A single sustained note. */
export function noteScript(midi: number, duration = 1.5): PromptScript {
  return script([{ midis: [midi], at: 0, duration, volume: 0.65 }]);
}

/**
 * A chord as the standard ear-training presentation: quick ascending
 * arpeggio (hear the parts), then the block chord (hear the whole).
 */
export function chordScript(midis: number[], blockDuration = 1.6): PromptScript {
  const arpStep = 0.28;
  const tones: PromptTone[] = midis.map((m, i) => ({ midis: [m], at: i * arpStep, duration: 0.32, volume: 0.55 }));
  tones.push({ midis, at: midis.length * arpStep + 0.15, duration: blockDuration, volume: 0.45 });
  return script(tones);
}

/** A melody line (already-timed notes). */
export function melodyScript(notes: { midi: number; start: number; duration: number }[]): PromptScript {
  return script(notes.map((n) => ({ midis: [n.midi], at: n.start, duration: n.duration, volume: 0.55 })));
}

/** Concatenate scripts with a gap of silence between them. */
export function sequenceScripts(scripts: PromptScript[], gap = 0.7): PromptScript {
  const tones: PromptTone[] = [];
  let offset = 0;
  for (const s of scripts) {
    for (const t of s.tones) tones.push({ ...t, at: t.at + offset });
    offset += s.length + gap;
  }
  return script(tones);
}

/**
 * Make sure sound will actually come out before a round begins.
 *
 * When the mic is held, the pitch engine has already configured and activated
 * a playAndRecord session — reconfiguring it here would yank the recorder's
 * settings, so only the context resume applies. Listening-only exercises get
 * their own playback session.
 */
export async function ensurePlaybackReady(options: { micHeld: boolean }): Promise<void> {
  try {
    if (!options.micHeld) {
      AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default' });
      await AudioManager.setAudioSessionActivity(true);
    }
    const ctx = audioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') throw new Error(`audio context is ${ctx.state}`);
  } catch (err) {
    throw new PlaybackError(err instanceof Error ? err.message : 'audio output unavailable');
  }
}

export interface PromptHandle {
  /** resolves when the prompt finishes *or* is cancelled — never rejects */
  done: Promise<void>;
  /** silence everything this prompt scheduled and settle `done` */
  cancel(): void;
}

export interface PromptPlayer {
  /** start a script now; any previous prompt from this player is cancelled first */
  play(script: PromptScript): PromptHandle;
  /** silence whatever is playing */
  cancel(): void;
}

const ATTACK = 0.04;
const RELEASE = 0.12;
/** scheduling headroom so the first tone's attack is never in the past */
const START_DELAY = 0.08;
/** settle margin after the audible end */
const TAIL = 0.15;

export function createPromptPlayer(): PromptPlayer {
  const voices = createToneGroup();
  let cancelActive: (() => void) | null = null;

  const cancel = () => {
    cancelActive?.();
    cancelActive = null;
  };

  return {
    play(promptScript: PromptScript): PromptHandle {
      cancel();
      const t0 = audioNow() + START_DELAY;
      for (const tone of promptScript.tones) {
        for (const midi of tone.midis) {
          voices.schedule({
            midi,
            at: t0 + tone.at,
            duration: tone.duration,
            volume: tone.volume ?? 0.55,
            attack: ATTACK,
            release: RELEASE,
          });
        }
      }

      let settle: () => void = () => {};
      const done = new Promise<void>((resolve) => {
        settle = resolve;
      });
      const cancelThis = () => {
        clearTimeout(timer);
        voices.cancel();
        settle();
      };
      const timer = setTimeout(() => {
        if (cancelActive === cancelThis) cancelActive = null;
        settle();
      }, (START_DELAY + promptScript.length + TAIL) * 1000);
      cancelActive = cancelThis;
      return {
        done,
        // a stale handle must never silence a newer prompt
        cancel: () => {
          if (cancelActive !== cancelThis) return;
          cancelActive = null;
          cancelThis();
        },
      };
    },

    cancel,
  };
}
