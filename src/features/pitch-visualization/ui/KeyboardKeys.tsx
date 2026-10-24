import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { AppText } from '@/shared/ui';
import { gradient, palette, radii } from '@/shared/theme';
import { noteName } from '@/shared/lib/staff';

export const pitchClass = (m: number) => ((m % 12) + 12) % 12;

/** what a key shows: the target fill, and the sung outline (as a value, or a shared value for the UI thread) */
export interface KeyMarks {
  targetMidi: number | null | undefined;
  sungMidi: number | null;
  sungNote: SharedValue<number> | undefined;
  onPressKey: ((midi: number) => void) | undefined;
}

export function WhiteKey({ midi, marks }: { midi: number; marks: KeyMarks }) {
  const isTarget = marks.targetMidi != null && midi === marks.targetMidi;
  const isSung = marks.sungMidi === midi;
  return (
    <Pressable
      disabled={!marks.onPressKey}
      onPress={() => marks.onPressKey?.(midi)}
      style={[styles.white, isSung && !isTarget && styles.whiteSung]}
    >
      {isTarget && <TargetFill />}
      {marks.sungNote && !isTarget && <SungOutline midi={midi} sungNote={marks.sungNote} width={2} />}
      {pitchClass(midi) === 0 && (
        <AppText variant="caption" color={isTarget ? palette.onAccent : palette.textFaint}>
          {noteName(midi)}
        </AppText>
      )}
    </Pressable>
  );
}

export function BlackKey({ midi, marks, left, width }: { midi: number; marks: KeyMarks; left: number; width: number }) {
  const isTarget = marks.targetMidi != null && midi === marks.targetMidi;
  const isSung = marks.sungMidi === midi;
  return (
    <Pressable
      disabled={!marks.onPressKey}
      onPress={() => marks.onPressKey?.(midi)}
      style={[styles.black, { left, width }, !isTarget && styles.blackFill, isSung && !isTarget && styles.blackSung]}
    >
      {isTarget && <TargetFill />}
      {marks.sungNote && !isTarget && <SungOutline midi={midi} sungNote={marks.sungNote} width={1.5} />}
    </Pressable>
  );
}

function TargetFill() {
  return <LinearGradient colors={gradient.accent} start={TOP} end={BOTTOM} style={StyleSheet.absoluteFill} />;
}

/** the sung key's outline, shown and hidden on the UI thread */
function SungOutline({ midi, sungNote, width }: { midi: number; sungNote: SharedValue<number>; width: number }) {
  const visible = useAnimatedStyle(() => ({ opacity: sungNote.value === midi ? 1 : 0 }));
  return <Animated.View pointerEvents="none" style={[styles.outline, { borderWidth: width }, visible]} />;
}

const TOP = { x: 0, y: 0 };
const BOTTOM = { x: 0, y: 1 };

const styles = StyleSheet.create({
  white: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 3,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: palette.surface,
  },
  whiteSung: { borderColor: palette.textPrimary, borderWidth: 2 },
  black: { position: 'absolute', top: 4, height: '56%', borderRadius: radii.sm, overflow: 'hidden' },
  blackFill: { backgroundColor: palette.keyBlack },
  blackSung: { borderColor: palette.textPrimary, borderWidth: 1.5 },
  outline: { ...StyleSheet.absoluteFill, borderColor: palette.textPrimary, borderRadius: radii.sm },
});
