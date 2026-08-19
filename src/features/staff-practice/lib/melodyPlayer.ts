/**
 * Plays the target melody as a soft reference (no backing track needed — the
 * content is a bare melody) and reports playback position for the moving
 * playhead. `rate` < 1 enables slow practice.
 *
 * Scheduling and the oscillator envelope come from the shared tone bus; this
 * module is only the timeline on top of it.
 *
 * A `silent` player is the same timeline with nothing scheduled. Staff
 * practice runs three: the demo sounds the phrase, the accompaniment sounds it
 * again for the singer to sing along to, and the silent one clocks the final
 * unaided pass. Splitting them this way — rather than muting one player —
 * means the solo pass has no oscillator to leak from at all, so no envelope or
 * volume regression can put reference audio back under the microphone.
 */
import { audioNow, createToneGroup, type ToneGroup } from '@/shared/audio';
import type { TargetNote } from '@/entities/exercise';

export interface MelodyPlayer {
  /** seconds of silent lead-in before the first note */
  readonly leadIn: number;
  start(): void;
  stop(): void;
  /** phrase time in seconds (negative during lead-in) */
  currentTime(): number;
  dispose(): void;
  readonly playing: boolean;
}

export interface MelodyPlayerOptions {
  rate?: number;
  leadIn?: number;
  volume?: number;
  /** schedule no audio at all — the timeline still runs */
  silent?: boolean;
  now?: () => number;
  /**
   * Whether this player gates the microphone while it sounds.
   *
   * Default true: the mic pipeline drops every frame captured while the player
   * is audible, so reference audio can never be graded as singing.
   *
   * The accompaniment stage sets this false, deliberately. That stage is a
   * sing-along — playback and capture have to run at the same instant, so
   * temporal separation is not available and gating would leave the singer
   * ungraded. On headphones this costs nothing, because no acoustic path back
   * to the mic exists. On the built-in speaker it is a known, accepted
   * trade: the mic does hear the guide, and that stage's score is inflated as
   * a result. `PitchEngineOptions.iosMode: 'voiceChat'` is the hook for
   * addressing that when speaker leakage is taken on properly.
   */
  gatesMicrophone?: boolean;
}

export function createMelodyPlayer(
  notes: TargetNote[],
  onEnded: () => void,
  opts: MelodyPlayerOptions = {}
): MelodyPlayer {
  const rate = opts.rate ?? 1;
  const leadIn = opts.leadIn ?? 1.2;
  const volume = opts.volume ?? 0.5;
  const silent = opts.silent === true;
  const gatesMicrophone = opts.gatesMicrophone !== false;
  // wall clock, injectable so a run can be driven deterministically in tests.
  // performance.now() is smoother frame-to-frame than the audio clock here.
  const now = opts.now ?? (() => performance.now());
  let voices: ToneGroup | null = null;
  let startedAtWall = 0;
  let playing = false;
  let disposed = false;
  let endTimer: ReturnType<typeof setTimeout> | null = null;

  const total = notes.reduce((m, n) => Math.max(m, n.start + n.duration), 0) / rate;

  return {
    leadIn,

    start() {
      if (playing || disposed) return;
      const t0 = audioNow() + leadIn;
      if (!silent) {
        voices?.cancel();
        voices = createToneGroup({ claimsSpeaker: gatesMicrophone });
        for (const note of notes) {
          voices.schedule({
            midi: note.midi,
            at: t0 + note.start / rate,
            duration: (note.duration / rate) * 0.92,
            volume,
            attack: 0.03,
            release: 0.06,
          });
        }
      }
      startedAtWall = now();
      playing = true;
      endTimer = setTimeout(
        () => {
          playing = false;
          onEnded();
        },
        (leadIn + total + 0.3) * 1000
      );
    },

    stop() {
      if (endTimer) clearTimeout(endTimer);
      endTimer = null;
      playing = false;
      // silence anything still queued. Without this, stopping only stopped the
      // *timeline*: the scheduled oscillators played on, so a restart layered a
      // second melody over the first and the reference kept sounding into a mic
      // pass that believed playback had ended.
      voices?.cancel();
    },

    currentTime() {
      if (!playing) return 0;
      const elapsed = (now() - startedAtWall) / 1000;
      return (elapsed - leadIn) * rate;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      if (endTimer) clearTimeout(endTimer);
      playing = false;
      // silences anything still queued — previously done by closing this
      // player's private AudioContext, which the shared bus no longer allows
      voices?.cancel();
    },

    get playing() {
      return playing;
    },
  };
}
