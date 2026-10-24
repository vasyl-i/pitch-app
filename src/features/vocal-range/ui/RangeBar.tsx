import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { gradient, palette, radii, spacing } from '@/shared/theme';
import { midiToName } from '@/shared/lib/music';

/** Piano-ish span showing the captured range and the live pitch marker. */
export function RangeBar({
  lowMidi,
  highMidi,
  currentMidi,
  /** the full span drawn, defaults to a typical singing compass (E2–C6) */
  floor = 40,
  ceiling = 84,
}: {
  lowMidi: number | null;
  highMidi: number | null;
  currentMidi: number | null;
  floor?: number;
  ceiling?: number;
}) {
  const pct = (midi: number) => Math.max(0, Math.min(100, ((midi - floor) / (ceiling - floor)) * 100));
  const hasRange = lowMidi !== null && highMidi !== null;

  return (
    <View>
      <View style={styles.track}>
        {hasRange && (
          <View style={[styles.span, { left: `${pct(lowMidi)}%`, width: `${Math.max(1.5, pct(highMidi) - pct(lowMidi))}%` }]}>
            <LinearGradient colors={gradient.accent} start={START} end={END} style={StyleSheet.absoluteFill} />
          </View>
        )}
        {currentMidi !== null && <View style={[styles.marker, { left: `${pct(currentMidi)}%` }]} />}
      </View>

      <View style={styles.labels}>
        <AppText variant="caption">{midiToName(floor)}</AppText>
        <AppText variant="small" color={palette.accent}>
          {hasRange ? `${midiToName(lowMidi)} – ${midiToName(highMidi)}` : '—'}
        </AppText>
        <AppText variant="caption">{midiToName(ceiling)}</AppText>
      </View>
    </View>
  );
}

const START = { x: 0, y: 0 };
const END = { x: 1, y: 0 };

const styles = StyleSheet.create({
  track: { height: 16, position: 'relative', overflow: 'hidden', borderRadius: radii.pill, backgroundColor: palette.borderSubtle },
  span: { position: 'absolute', top: 0, bottom: 0, borderRadius: radii.pill, overflow: 'hidden', opacity: 0.55 },
  marker: { position: 'absolute', top: -3, width: 3, height: 22, marginLeft: -1.5, borderRadius: 2, backgroundColor: palette.textPrimary },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
});
