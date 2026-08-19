/**
 * The interlock between the app's audio *output* and its audio *input*.
 *
 * The device plays the reference melody out of the loudspeaker (the capture
 * session runs `playAndRecord` with `defaultToSpeaker`) while the microphone
 * is live, so the mic genuinely hears the reference. Nothing downstream can
 * undo that: the reference is a triangle oscillator held dead steady on the
 * target note, which YIN reports with higher clarity and better tuning than
 * any human, and the voice gate is a level-and-continuity test that loud,
 * pitch-continuous bleed sails straight through.
 *
 * So the separation is enforced here instead, on the one fact that is not a
 * guess: the app knows exactly what it scheduled and when. A frame captured
 * while the speaker was sounding reference audio is not evidence about the
 * singer, and is discarded.
 */
// imported from the monitor module rather than the audio barrel on purpose:
// the interlock depends only on the bookkeeping, so the input path never has
// to pull in the output stack
import { isReferenceAudible } from '@/shared/audio/referenceMonitor';

/**
 * How long after the reference stops sounding the mic is still treated as
 * contaminated.
 *
 * A PitchFrame is not an instant. YIN analyses a ~46ms sliding window, so a
 * frame delivered at T carries room audio reaching back to T−46ms; on top of
 * that sit speaker→mic flight time, the room's reverb tail and the drift
 * between the audio and wall clocks. Overshooting costs a handful of
 * discarded frames at the top of a sing pass; undershooting lets the decay of
 * a reference note be graded as singing, which is the whole failure this
 * exists to make structurally impossible.
 */
export const REFERENCE_GUARD_MS = 150;

/** True when a frame captured at `now` may contain the app's own output. */
export function referenceContaminates(now = Date.now()): boolean {
  return isReferenceAudible(REFERENCE_GUARD_MS, now);
}
