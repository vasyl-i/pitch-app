import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useStabilizedNote } from '../lib/useStabilizedNote';
import { BlackKey, pitchClass, WhiteKey, type KeyMarks } from './KeyboardKeys';

const MIN_BLACK_WIDTH = 14;
const MAX_BLACK_WIDTH = 28;
const WHITE_KEY_GAP = 2;

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];

/**
 * A compact piano strip spanning a MIDI range, highlighting a target note
 * (accent fill) and/or the pitch currently being sung (white outline).
 *
 * Props-driven rather than reading a store directly, so both staff practice
 * (target = the active exercise note) and vocal-range detection/settings
 * (target = the note being edited, or none) can share the same geometry
 * instead of each maintaining its own copy of the key-layout math.
 */
export function PitchKeyboard({ lowMidi, highMidi, liveMidi = null, sungNote, targetMidi, onPressKey }: {
  lowMidi: number;
  highMidi: number;
  liveMidi?: number | null;
  /**
   * The sung key as a shared value (an integer MIDI note, -1 for none),
   * already held steady by the caller. Outlines it on the UI thread, so a
   * live pitch never re-renders the keyboard; overrides `liveMidi`.
   */
  sungNote?: SharedValue<number>;
  targetMidi?: number | null;
  /** if provided, keys become tappable (manual note picking in settings) */
  onPressKey?: (midi: number) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const handleLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const { whites, blacks } = useMemo(() => keyLayout(lowMidi, highMidi), [lowMidi, highMidi]);

  // presentation only — the highlighted key holds through small excursions
  const stabilized = useStabilizedNote(liveMidi);
  const marks: KeyMarks = { targetMidi, sungMidi: sungNote ? null : stabilized, sungNote, onPressKey };

  const whiteKeyWidth = containerWidth > 0 ? (containerWidth - (whites.length - 1) * WHITE_KEY_GAP) / whites.length : 0;
  const blackWidth = Math.min(MAX_BLACK_WIDTH, Math.max(MIN_BLACK_WIDTH, whiteKeyWidth * 0.6));

  return (
    <View style={styles.wrap}>
      <View style={styles.keys} onLayout={handleLayout}>
        {whites.map((m) => (
          <WhiteKey key={m} midi={m} marks={marks} />
        ))}
        {/* black keys overlaid between their left white neighbour and the next */}
        {containerWidth > 0 &&
          blacks.map((m) => {
            const leftWhiteIdx = whites.filter((w) => w < m).length - 1;
            if (leftWhiteIdx < 0 || leftWhiteIdx >= whites.length - 1) return null;
            // centred on the gap after the left white key
            const centre = (leftWhiteIdx + 1) * (whiteKeyWidth + WHITE_KEY_GAP) - WHITE_KEY_GAP / 2;
            return <BlackKey key={m} midi={m} marks={marks} left={centre - blackWidth / 2} width={blackWidth} />;
          })}
      </View>
    </View>
  );
}

/** the white and black keys from the C at or below `lowMidi` to `highMidi` (at least an octave) */
function keyLayout(lowMidi: number, highMidi: number) {
  const start = lowMidi - pitchClass(lowMidi);
  const end = Math.max(highMidi, start + 12);
  const whites: number[] = [];
  const blacks: number[] = [];
  for (let m = start; m <= end; m++) {
    if (NATURAL_PCS.includes(pitchClass(m))) whites.push(m);
    else if (BLACK_PCS.includes(pitchClass(m))) blacks.push(m);
  }
  return { whites, blacks };
}

const styles = StyleSheet.create({
  wrap: { height: 56 },
  keys: { flex: 1, flexDirection: 'row', gap: WHITE_KEY_GAP, position: 'relative' },
});
