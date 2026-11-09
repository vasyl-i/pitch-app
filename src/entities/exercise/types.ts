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
import type { Language } from '../../shared/i18n';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ExercisePattern = 'scale' | 'arpeggio';

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
  /**
   * Set when the exercise is a scale or an arpeggio. Practised on its own, a
   * scale sweeps up and down through the singer's keys and an arpeggio hops
   * between random ones, round after round (see `nextSweepKey`, `randomKey`).
   */
  pattern?: ExercisePattern;
  /** optional technique note shown before the exercise starts */
  hint?: string;
  notes: TargetNote[];
  /**
   * The whole song, when `notes` is only part of it (a verse, a verse and its
   * chorus). Sung only on request from the library — never in a lesson.
   */
  fullNotes?: TargetNote[];
  /** the UI languages it is offered in; absent means every language */
  languages?: readonly Language[];
}

export type { ExerciseCategory };
