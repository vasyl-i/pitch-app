import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { AnimatedText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { centsColor, centsText, hzText, liveMidi, shownNoteText } from '../model/livePitchDisplay';

const { textFaint, textPrimary } = palette;

/**
 * The live note name + cents deviation, shown large and calm above the staff.
 *
 * Drawn from shared values on the UI thread (see livePitchDisplay): it changes
 * ~30 times a second while singing and never re-renders for it. The note name
 * holds through small excursions across a boundary; the cents are raw.
 */
export function LiveReadout({ showHz = false }: { showHz?: boolean }) {
  // faint while silent
  const noteColor = useDerivedValue<string>(() => (Number.isNaN(liveMidi.value) ? textFaint : textPrimary));

  return (
    <View style={styles.row}>
      <AnimatedText text={shownNoteText} color={noteColor} variant="title" style={styles.note} />
      <AnimatedText text={centsText} color={centsColor} variant="subtitle" weight="regular" style={styles.cents} />
      {showHz && <AnimatedText text={hzText} color={palette.textFaint} variant="small" style={styles.cents} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.md, height: 34 },
  // fixed widths: an animated text can't resize itself, so each box fits its
  // longest value ('C#5', '+50¢', '1047 Hz') and the pair meets at the centre
  note: { width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  cents: { width: 72, textAlign: 'left', fontVariant: ['tabular-nums'] },
});
