import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';

/**
 * A 0..1 confidence readout as a thin bar plus a percentage. Used wherever a
 * detection needs to tell the singer "trust this reading" vs. "try again" —
 * vocal-range detection and mic calibration both read the same clarity
 * signal the pitch engine produces, so they share one visual language for it.
 */
export function ConfidenceMeter({ confidence, label = 'Confidence' }: { confidence: number; label?: string }) {
  const { palette, radii, gradient } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const color = pct >= 70 ? palette.accent : pct >= 40 ? palette.warning : palette.danger;
  const isAccent = color === palette.accent;

  return (
    <View>
      <View style={styles.row}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="caption" color={color}>
          {pct}%
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: palette.borderSubtle, borderRadius: radii.pill }]}>
        <View style={[styles.fill, { width: `${pct}%`, borderRadius: radii.pill, overflow: 'hidden' }]}>
          {isAccent ? (
            <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 6, overflow: 'hidden' },
  fill: { height: '100%' },
});
