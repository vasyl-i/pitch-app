import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { noteName } from '@/shared/lib/staff';
import { useStabilizedNote } from '../lib/useStabilizedNote';

const MIN_BLACK_WIDTH = 14;
const MAX_BLACK_WIDTH = 28;

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];

/**
 * A compact piano strip spanning a MIDI range, highlighting a target note
 * (cyan fill) and/or the pitch currently being sung (white outline).
 *
 * Props-driven rather than reading a store directly, so both staff practice
 * (target = the active exercise note) and vocal-range detection/settings
 * (target = the note being edited, or none) can share the same geometry
 * instead of each maintaining its own copy of the key-layout math.
 */
export function PitchKeyboard({
  lowMidi,
  highMidi,
  liveMidi,
  targetMidi,
  onPressKey,
}: {
  lowMidi: number;
  highMidi: number;
  liveMidi: number | null;
  targetMidi?: number | null;
  /** if provided, keys become tappable (manual note picking in settings) */
  onPressKey?: (midi: number) => void;
}) {
  const { palette, radii, gradient } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const handleLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const { whites, blacks } = useMemo(() => {
    const start = lowMidi - (((lowMidi % 12) + 12) % 12); // floor to C
    const end = Math.max(highMidi, start + 12);
    const whiteMidis: number[] = [];
    for (let m = start; m <= end; m++) if (NATURAL_PCS.includes(((m % 12) + 12) % 12)) whiteMidis.push(m);
    const blackMidis: number[] = [];
    for (let m = start; m <= end; m++) if (BLACK_PCS.includes(((m % 12) + 12) % 12)) blackMidis.push(m);
    return { whites: whiteMidis, blacks: blackMidis };
  }, [lowMidi, highMidi]);

  // presentation only — the highlighted key holds through small excursions
  const sungMidi = useStabilizedNote(liveMidi);

  // Compute clamped black key width from measured container
  const whiteKeyGap = 2;
  const whiteKeyWidth = containerWidth > 0
    ? (containerWidth - (whites.length - 1) * whiteKeyGap) / whites.length
    : 0;
  const blackWidth = Math.min(MAX_BLACK_WIDTH, Math.max(MIN_BLACK_WIDTH, whiteKeyWidth * 0.6));

  return (
    <View style={styles.wrap}>
      <View style={styles.keys} onLayout={handleLayout}>
        {whites.map((m) => {
          const isTarget = targetMidi != null && m === targetMidi;
          const isSung = sungMidi === m;
          return (
            <Pressable
              key={m}
              disabled={!onPressKey}
              onPress={() => onPressKey?.(m)}
              style={[
                styles.white,
                { borderColor: palette.borderSubtle, borderRadius: radii.sm, overflow: 'hidden' },
                isSung && !isTarget && { borderColor: palette.textPrimary, borderWidth: 2 },
              ]}
            >
              {isTarget && (
                <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              )}
              {((m % 12) + 12) % 12 === 0 && (
                <AppText variant="caption" color={isTarget ? palette.onAccent : palette.textFaint} style={styles.cLabel}>
                  {noteName(m)}
                </AppText>
              )}
            </Pressable>
          );
        })}
        {/* black keys overlaid between their left white neighbor and the next */}
        {containerWidth > 0 && blacks.map((m) => {
          const leftWhiteIdx = whites.filter((w) => w < m).length - 1;
          if (leftWhiteIdx < 0 || leftWhiteIdx >= whites.length - 1) return null;
          const isTarget = targetMidi != null && m === targetMidi;
          const isSung = sungMidi === m;
          // Center between the right edge of left white key and left edge of next
          const leftPx = (leftWhiteIdx + 1) * (whiteKeyWidth + whiteKeyGap) - whiteKeyGap / 2;
          return (
            <Pressable
              key={m}
              disabled={!onPressKey}
              onPress={() => onPressKey?.(m)}
              style={[
                styles.black,
                {
                  left: leftPx - blackWidth / 2,
                  width: blackWidth,
                  backgroundColor: isTarget ? undefined : '#0b0c0e',
                  borderRadius: radii.sm,
                  overflow: 'hidden',
                },
                isSung && !isTarget && { borderColor: palette.textPrimary, borderWidth: 1.5 },
              ]}
            >
              {isTarget && (
                <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 56 },
  keys: { flex: 1, flexDirection: 'row', gap: 2, position: 'relative' },
  white: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 3, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  cLabel: { fontSize: 9 },
  black: { position: 'absolute', top: 4, height: '56%' },
});
