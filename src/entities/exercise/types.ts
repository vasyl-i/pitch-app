/** Target-melody exercise types. All content is public-domain or original —
 * no copyrighted commercial recordings (see the product's content policy). */

export interface TargetNote {
  /** MIDI pitch of the target (e.g. 64 = E4) */
  midi: number;
  /** phrase-relative start time, seconds */
  start: number;
  /** duration, seconds */
  duration: number;
  /** optional lyric syllable shown under the note */
  lyric?: string;
}

import type { ExerciseCategory } from './categories';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Exercise {
  id: string;
  title: string;
  /** short subtitle, e.g. "Beethoven · public domain" */
  source: string;
  /** tonic key for spelling/context, e.g. "C major" */
  key: string;
  /** beats per minute the melody was authored at (for the slow-playback feature) */
  bpm: number;
  /** the family this belongs to — also decides free vs. Premium (see categories) */
  category: ExerciseCategory;
  difficulty: Difficulty;
  /** optional technique note shown before the exercise starts */
  hint?: string;
  notes: TargetNote[];
}

export type { ExerciseCategory };
