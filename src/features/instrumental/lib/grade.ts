/**
 * Classifying a sung pitch against a song's detected key — the music-theory
 * core of instrumental practice, per the project's chord/key grading approach
 * (grade against the key, never against a copyrighted vocal).
 *
 * Octave-agnostic: singers use their own register.
 */
import { PITCH_CLASSES } from '@/shared/lib/music';
import type { DetectedKey } from '../model/types';

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/** pitch classes of the key's diatonic scale */
export function keyPitchClasses(keyName: string): number[] {
  const [root, quality] = keyName.split(' ');
  const rootPc = PITCH_CLASSES.indexOf(root as (typeof PITCH_CLASSES)[number]);
  const steps = quality === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
  return steps.map((s) => (rootPc + s) % 12);
}

export type IntonationClass = 'in-key' | 'near' | 'off';

export interface IntonationVerdict {
  cls: IntonationClass;
  /** signed cents to the nearest scale tone (−600..+600) */
  cents: number;
}

/** cents within which a note counts as squarely on a scale tone */
export const IN_KEY_CENTS = 35;
/** beyond this the singer is on a non-scale note, not just out of tune */
export const NEAR_CENTS = 70;

/** the shared 3-band accuracy read: in-key / near / off */
export function classifyCents(cents: number): IntonationClass {
  const a = Math.abs(cents);
  return a <= IN_KEY_CENTS ? 'in-key' : a <= NEAR_CENTS ? 'near' : 'off';
}

/**
 * Grade a continuous sung midi value (fractional) against the key's scale.
 * The chord timeline, when analysis provides one, will refine this to
 * chord-tone awareness; with an empty timeline the key scale is the target.
 */
export function gradePitch(sungMidi: number, key: DetectedKey): IntonationVerdict {
  const scale = keyPitchClasses(key.keyName);
  const sungPc = ((sungMidi % 12) + 12) % 12;

  let best = Number.POSITIVE_INFINITY;
  for (const pc of scale) {
    let diff = sungPc - pc;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    if (Math.abs(diff) < Math.abs(best)) best = diff;
  }

  const cents = Math.round(best * 100);
  return { cls: classifyCents(cents), cents };
}
