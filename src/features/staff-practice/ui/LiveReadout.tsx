import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { colorForCents, midiToFreq } from '@/shared/lib/music';
import { noteName } from '@/shared/lib/staff';
import { useStabilizedNote } from '@/features/pitch-visualization';
import { useStaffStore } from '../model/staffStore';

/** The live note name + cents deviation, shown large and calm above the staff. */
export function LiveReadout({ showHz = false }: { showHz?: boolean }) {
  const { palette } = useTheme();
  const liveMidi = useStaffStore((s) => s.liveMidi);
  const liveCents = useStaffStore((s) => s.liveCents);

  // Presentation only: the note name holds through small excursions across a
  // boundary. `liveMidi` and `liveCents` are raw and are displayed as-is.
  const shownNote = useStabilizedNote(liveMidi);

  const color = liveCents === null ? palette.textFaint : colorForCents(liveCents);

  return (
    <View style={styles.row}>
      <AppText variant="title" color={liveMidi === null ? palette.textFaint : palette.textPrimary} style={styles.note}>
        {shownNote === null ? '—' : noteName(shownNote)}
      </AppText>
      <AppText variant="label" color={color} style={styles.cents}>
        {liveCents === null ? '' : `${liveCents > 0 ? '+' : ''}${Math.round(liveCents)}¢`}
      </AppText>
      {showHz && liveMidi !== null && (
        <AppText variant="caption" style={styles.hz}>
          {Math.round(midiToFreq(liveMidi))} Hz
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 12, height: 34 },
  note: { fontSize: 26, fontVariant: ['tabular-nums'] },
  cents: { fontSize: 18, fontVariant: ['tabular-nums'] },
  hz: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
