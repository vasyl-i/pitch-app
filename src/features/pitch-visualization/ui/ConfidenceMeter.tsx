import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { gradient, palette, radii } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/**
 * A 0..1 confidence readout as a thin bar plus a percentage. Used wherever a
 * detection needs to tell the singer "trust this reading" vs. "try again" —
 * vocal-range detection and mic calibration both read the same clarity
 * signal the pitch engine produces, so they share one visual language for it.
 */
export function ConfidenceMeter({ confidence, label }: { confidence: number; label?: string }) {
  const { t } = useTranslation();
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const color = pct >= 70 ? palette.accent : pct >= 40 ? palette.warning : palette.danger;

  return (
    <View>
      <View style={styles.row}>
        <AppText variant="caption">{label ?? t('pitch.confidence')}</AppText>
        <AppText variant="caption" color={color}>
          {pct}%
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]}>
          {color === palette.accent ? (
            <LinearGradient colors={gradient.accent} start={START} end={END} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.neutralFill} />
          )}
        </View>
      </View>
    </View>
  );
}

const START = { x: 0, y: 0 };
const END = { x: 1, y: 1 };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 6, overflow: 'hidden', borderRadius: radii.pill, backgroundColor: palette.borderSubtle },
  fill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  neutralFill: { ...StyleSheet.absoluteFill, backgroundColor: palette.meterFill },
});
