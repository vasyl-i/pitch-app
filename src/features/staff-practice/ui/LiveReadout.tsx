import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { AnimatedText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { centsColor, centsText, hzText, liveMidi, shownNoteText } from '../model/livePitchDisplay';

/**
 * The live note name + cents deviation, shown large and calm above the staff.
 *
 * Drawn from shared values on the UI thread (see livePitchDisplay): it changes
 * ~30 times a second while singing and never re-renders for it. The note name
 * holds through small excursions across a boundary; the cents are raw.
 */
export function LiveReadout({ showHz = false }: { showHz?: boolean }) {
  // from the theme hook, so the font follows a live language switch
  const { palette, typography } = useTheme();
  const { textFaint, textPrimary } = palette;
  // faint while silent
  const noteColor = useDerivedValue<string>(() => (Number.isNaN(liveMidi.value) ? textFaint : textPrimary));

  return (
    <View style={styles.row}>
      <AnimatedText text={shownNoteText} color={noteColor} style={{ ...styles.note, fontFamily: typography.family.bold }} />
      <AnimatedText text={centsText} color={centsColor} style={{ ...styles.cents, fontFamily: typography.family.regular }} />
      {showHz && (
        <AnimatedText
          text={hzText}
          color={palette.textFaint}
          style={{ ...styles.hz, fontFamily: typography.family.regular }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 12, height: 34 },
  // fixed widths: an animated text can't resize itself, so each box fits its
  // longest value ('C#5', '+50¢', '1047 Hz') and the pair meets at the centre
  note: { fontSize: 26, lineHeight: 34, width: 72, textAlign: 'right', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  cents: { fontSize: 18, lineHeight: 24, width: 72, textAlign: 'left', fontVariant: ['tabular-nums'] },
  hz: { fontSize: 13, lineHeight: 18, width: 72, textAlign: 'left', fontVariant: ['tabular-nums'] },
});
