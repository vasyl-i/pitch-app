/**
 * Maps exercise activity IDs and kinds to Ionicon glyphs and palette tint
 * colors for the TodayExerciseList cards.
 */
import type { ImageSourcePropType } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import type { Activity } from '@/features/learning';
import { todayColor } from '../todayPalette';

interface ExerciseIcon {
  name: keyof typeof Ionicons.glyphMap;
  tint: string;
  glyph: string; // deep/vivid color for the icon itself
}

const EAR_ICONS: Record<string, ExerciseIcon> = {
  'note-echo': { name: 'ear', tint: todayColor.orangeTint, glyph: todayColor.orangeDeep },
  'major-minor': { name: 'help', tint: todayColor.lavenderTint, glyph: todayColor.lavenderDeep },
  'melody-echo': { name: 'musical-notes', tint: todayColor.blueTint, glyph: todayColor.blueDeep },
  'pitch-memory': { name: 'hourglass', tint: todayColor.indigoTint, glyph: todayColor.indigoDeep },
  'odd-one-out': { name: 'search', tint: todayColor.orangeTint, glyph: todayColor.orangeDeep },
  'finish-melody': { name: 'musical-note', tint: todayColor.lavenderTint, glyph: todayColor.lavenderDeep },
  'echo-interval': { name: 'swap-horizontal', tint: todayColor.blueTint, glyph: todayColor.blueDeep },
  'sing-interval': { name: 'trending-up', tint: todayColor.indigoTint, glyph: todayColor.indigoDeep },
  'chord-tones': { name: 'layers', tint: todayColor.orangeTint, glyph: todayColor.orangeDeep },
};

const MELODY_FALLBACK: ExerciseIcon = { name: 'musical-notes', tint: todayColor.blueTint, glyph: todayColor.blueDeep };
const EAR_FALLBACK: ExerciseIcon = { name: 'ear', tint: todayColor.orangeTint, glyph: todayColor.orangeDeep };

/** palette-tint cycle for melody exercises that don't have a specific entry */
const MELODY_TINTS: ExerciseIcon[] = [
  { name: 'musical-notes', tint: todayColor.blueTint, glyph: todayColor.blueDeep },
  { name: 'mic', tint: todayColor.lavenderTint, glyph: todayColor.lavenderDeep },
  { name: 'musical-note', tint: todayColor.indigoTint, glyph: todayColor.indigoDeep },
  { name: 'pulse', tint: todayColor.orangeTint, glyph: todayColor.orangeDeep },
];

export function exerciseIcon(activityId: string, kind: Activity['kind'], index = 0): ExerciseIcon {
  if (kind === 'ear') return EAR_ICONS[activityId] ?? EAR_FALLBACK;
  return MELODY_TINTS[index % MELODY_TINTS.length] ?? MELODY_FALLBACK;
}

/**
 * Maps exercise activity IDs to cat illustration PNGs.
 * Add your cat images to assets/cats/ and require them here.
 *
 * Usage in ExerciseRow:
 *   const catIcon = EXERCISE_CAT_ICONS[step.activityId];
 *   if (catIcon) return <Image source={catIcon} style={{ width: 48, height: 48 }} />;
 */
interface CatIcon {
  source: ImageSourcePropType;
  /** Padding inside the 56×56 container so decorative elements fit. */
  inset?: number;
}

export const EXERCISE_CAT_ICONS: Partial<Record<string, CatIcon>> = {
  'note-echo': { source: require('../../../../assets/EchoTheNote.png') },
  'pitch-memory': { source: require('../../../../assets/PitchMemory.png'), inset: 4 },
  'sing-interval': { source: require('../../../../assets/SingTheInterval.png') },
  'melody-echo': { source: require('../../../../assets/SingTheScale.png') },
  'chord-tones': { source: require('../../../../assets/ChordTones.png') },
  'major-minor': { source: require('../../../../assets/ChordTones.png') },
  'odd-one-out': { source: require('../../../../assets/ChordTones.png') },
  'finish-melody': { source: require('../../../../assets/PitchMemory.png'), inset: 4 },
  'echo-interval': { source: require('../../../../assets/EchoTheNote.png') },
};

export const DEFAULT_CAT_ICON: CatIcon = { source: require('../../../../assets/SingTheInterval.png') };

/** Short descriptions shown below the exercise title in the daily plan */
export const EXERCISE_DESCRIPTIONS: Record<string, string> = {
  'note-echo': 'Hear a note and sing it back',
  'pitch-memory': 'Hear a note and sing it back in 1 minute',
  'sing-interval': 'Hear an interval and sing it back',
  'melody-echo': 'Hear a scale and sing it back',
  'chord-tones': 'Hear a tones of the chord',
  'major-minor': 'Listen and tell major from minor',
  'odd-one-out': 'Find the note that doesn\u2019t belong',
  'finish-melody': 'Hear a melody and sing the last note',
  'echo-interval': 'Hear an interval and echo it back',
};
