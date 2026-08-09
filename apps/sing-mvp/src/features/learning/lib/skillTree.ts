/**
 * The structured learning progressions: ten categories, each a sequence of
 * lesson nodes over catalog activities. Nodes unlock through demonstrated
 * *mastery* (skill thresholds), not level numbers. The user-facing view of
 * this data is the Journey (`./journey.ts`) — progress markers, not a menu.
 */
import type { Activity, SkillId } from '../model/types';
import { activityById } from './catalog';

export type SkillCategory =
  | 'pitch'
  | 'intervals'
  | 'chords'
  | 'melody'
  | 'rhythm'
  | 'tonality'
  | 'voice-control'
  | 'musical-memory'
  | 'sight-singing'
  | 'performance';

export interface LessonNode {
  id: string;
  title: string;
  category: SkillCategory;
  /** what to launch */
  activity: { kind: Activity['kind']; id: string };
  difficultyId?: string;
  /** the skill whose mastery this node develops and is judged by */
  primarySkill: SkillId;
  /** mastery gates that must all be met before the node unlocks */
  requires: { skill: SkillId; mastery: number }[];
}

const node = (
  id: string,
  title: string,
  category: SkillCategory,
  kind: Activity['kind'],
  activityId: string,
  primarySkill: SkillId,
  requires: { skill: SkillId; mastery: number }[] = [],
  difficultyId?: string
): LessonNode => ({ id, title, category, activity: { kind, id: activityId }, difficultyId, primarySkill, requires });

export const SKILL_TREE: LessonNode[] = [
  // Pitch — hear a note, land it, hold it in mind
  node('pitch-1', 'Echo the note', 'pitch', 'ear', 'note-echo', 'pitch-accuracy'),
  node('pitch-2', 'Scale in tune', 'pitch', 'melody', 'c-major-scale', 'pitch-accuracy', [{ skill: 'pitch-accuracy', mastery: 35 }]),
  node('pitch-3', 'Short pitch memory', 'pitch', 'ear', 'pitch-memory', 'pitch-memory', [{ skill: 'pitch-accuracy', mastery: 45 }], 'easy'),
  node('pitch-4', 'Long pitch memory', 'pitch', 'ear', 'pitch-memory', 'pitch-memory', [{ skill: 'pitch-memory', mastery: 55 }], 'hard'),

  // Intervals — recognize, then echo the sound, then sing from memory, growing sets
  node('intervals-1', 'Spot the interval', 'intervals', 'ear', 'odd-one-out', 'interval-recognition', [], 'intervals'),
  node('intervals-1b', 'Echo the interval', 'intervals', 'ear', 'echo-interval', 'interval-recognition', [{ skill: 'interval-recognition', mastery: 20 }], 'beginner'),
  node('intervals-2', 'Sing easy intervals', 'intervals', 'ear', 'sing-interval', 'interval-singing', [{ skill: 'interval-recognition', mastery: 35 }], 'beginner'),
  node('intervals-3', 'Wider intervals', 'intervals', 'ear', 'sing-interval', 'interval-singing', [{ skill: 'interval-singing', mastery: 50 }], 'intermediate'),
  node('intervals-4', 'All intervals, both ways', 'intervals', 'ear', 'sing-interval', 'interval-singing', [{ skill: 'interval-singing', mastery: 70 }], 'advanced'),

  // Chords — hear quality, then sing the tones
  node('chords-1', 'Major or minor?', 'chords', 'ear', 'major-minor', 'chord-recognition'),
  node('chords-2', 'Spot the chord', 'chords', 'ear', 'odd-one-out', 'chord-recognition', [{ skill: 'chord-recognition', mastery: 40 }], 'chords'),
  node('chords-3', 'Sing chord tones', 'chords', 'ear', 'chord-tones', 'chord-singing', [{ skill: 'chord-recognition', mastery: 50 }], 'beginner'),
  node('chords-4', 'Complex chords', 'chords', 'ear', 'chord-tones', 'chord-singing', [{ skill: 'chord-singing', mastery: 60 }], 'advanced'),

  // Melody — echo short phrases, then longer, then complete them
  node('melody-1', 'Echo two notes', 'melody', 'ear', 'melody-echo', 'melody-reproduction', [], 'beginner'),
  node('melody-2', 'Echo short phrases', 'melody', 'ear', 'melody-echo', 'melody-reproduction', [{ skill: 'melody-reproduction', mastery: 40 }], 'intermediate'),
  node('melody-3', 'Sing a full song', 'melody', 'melody', 'twinkle', 'melody-reproduction', [{ skill: 'melody-reproduction', mastery: 50 }]),
  node('melody-4', 'Echo long phrases', 'melody', 'ear', 'melody-echo', 'melody-reproduction', [{ skill: 'melody-reproduction', mastery: 65 }], 'advanced'),

  // Rhythm — timing graded against notation
  node('rhythm-1', 'Steady simple song', 'rhythm', 'melody', 'mary-lamb', 'rhythm-accuracy'),
  node('rhythm-2', 'Longer phrases in time', 'rhythm', 'melody', 'frere-jacques', 'rhythm-accuracy', [{ skill: 'rhythm-accuracy', mastery: 45 }]),
  node('rhythm-3', 'Mixed note lengths', 'rhythm', 'melody', 'ode-to-joy', 'rhythm-accuracy', [{ skill: 'rhythm-accuracy', mastery: 55 }]),

  // Tonality — major vs minor feel, resolution
  node('tonality-1', 'Spot the scale', 'tonality', 'ear', 'odd-one-out', 'musical-memory', [], 'scales'),
  node('tonality-2', 'Finish the melody', 'tonality', 'ear', 'finish-melody', 'musical-memory', [{ skill: 'musical-memory', mastery: 40 }]),
  node('tonality-3', 'Minor colors', 'tonality', 'melody', 'e-minor-scale', 'pitch-accuracy', [{ skill: 'musical-memory', mastery: 50 }]),

  // Voice control — sustained, steady tone across the range
  node('voice-1', 'Major arpeggio', 'voice-control', 'melody', 'major-arpeggio', 'voice-control'),
  node('voice-2', 'Minor scale, steady', 'voice-control', 'melody', 'e-minor-scale', 'voice-control', [{ skill: 'voice-control', mastery: 40 }]),
  node('voice-3', 'Minor arpeggio', 'voice-control', 'melody', 'minor-arpeggio', 'voice-control', [{ skill: 'voice-control', mastery: 55 }]),

  // Musical memory — hold more music in mind, longer
  node('memory-1', 'Hold one note', 'musical-memory', 'ear', 'pitch-memory', 'pitch-memory', [], 'easy'),
  node('memory-2', 'Hold a phrase', 'musical-memory', 'ear', 'melody-echo', 'musical-memory', [{ skill: 'musical-memory', mastery: 40 }], 'intermediate'),
  node('memory-3', 'One minute of memory', 'musical-memory', 'ear', 'pitch-memory', 'pitch-memory', [{ skill: 'pitch-memory', mastery: 55 }], 'hard'),
  node('memory-4', 'Long phrases from memory', 'musical-memory', 'ear', 'melody-echo', 'musical-memory', [{ skill: 'musical-memory', mastery: 70 }], 'advanced'),

  // Sight singing — sing what the staff shows
  node('sight-1', 'Scale from the staff', 'sight-singing', 'melody', 'c-major-scale', 'sight-singing'),
  node('sight-2', 'First song from notation', 'sight-singing', 'melody', 'mary-lamb', 'sight-singing', [{ skill: 'sight-singing', mastery: 35 }]),
  node('sight-3', 'Read a classic', 'sight-singing', 'melody', 'ode-to-joy', 'sight-singing', [{ skill: 'sight-singing', mastery: 50 }]),
  node('sight-4', 'Longer reads', 'sight-singing', 'melody', 'frere-jacques', 'sight-singing', [{ skill: 'sight-singing', mastery: 60 }]),

  // Performance — capstones that combine skills
  node('perform-1', 'Polish a piece', 'performance', 'melody', 'ode-to-joy', 'melody-reproduction', [
    { skill: 'melody-reproduction', mastery: 60 },
    { skill: 'voice-control', mastery: 50 },
  ]),
  node('perform-2', 'Command the intervals', 'performance', 'ear', 'sing-interval', 'interval-singing', [{ skill: 'interval-singing', mastery: 70 }], 'advanced'),
  node('perform-3', 'Full chord command', 'performance', 'ear', 'chord-tones', 'chord-singing', [
    { skill: 'chord-singing', mastery: 70 },
    { skill: 'pitch-stability', mastery: 60 },
  ], 'advanced'),
];

export const SKILL_TREE_CATEGORIES: SkillCategory[] = [
  'pitch',
  'intervals',
  'chords',
  'melody',
  'rhythm',
  'tonality',
  'voice-control',
  'musical-memory',
  'sight-singing',
  'performance',
];

/** resolve a node's launchable activity (undefined only on a catalog mismatch) */
export function nodeActivity(n: LessonNode): Activity | undefined {
  return activityById(n.activity.kind, n.activity.id);
}
