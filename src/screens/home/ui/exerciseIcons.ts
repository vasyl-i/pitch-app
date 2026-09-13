/**
 * Maps exercise activity IDs and kinds to Ionicon glyphs and palette tint
 * colors for the TodayExerciseList cards.
 */
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
