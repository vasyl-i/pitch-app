import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
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
  const { palette, radii, gradient } = useTheme();
  const pct = (midi: number) => Math.max(0, Math.min(100, ((midi - floor) / (ceiling - floor)) * 100));

  return (
    <View>
      <View style={[styles.track, { backgroundColor: palette.borderSubtle, borderRadius: radii.pill }]}>
        {lowMidi !== null && highMidi !== null && (
          <View
            style={[
              styles.span,
              {
                left: `${pct(lowMidi)}%`,
                width: `${Math.max(1.5, pct(highMidi) - pct(lowMidi))}%`,
                borderRadius: radii.pill,
                overflow: 'hidden',
                opacity: 0.55,
              },
            ]}
          >
            <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </View>
        )}
        {currentMidi !== null && (
          <View style={[styles.marker, { left: `${pct(currentMidi)}%`, backgroundColor: palette.textPrimary }]} />
        )}
      </View>

      <View style={styles.labels}>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          {midiToName(floor)}
        </AppText>
        <AppText variant="label" color={palette.accent} style={{ fontSize: 15 }}>
          {lowMidi !== null && highMidi !== null ? `${midiToName(lowMidi)} – ${midiToName(highMidi)}` : '—'}
        </AppText>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          {midiToName(ceiling)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 16, position: 'relative', overflow: 'hidden' },
  span: { position: 'absolute', top: 0, bottom: 0 },
  marker: { position: 'absolute', top: -3, width: 3, height: 22, marginLeft: -1.5, borderRadius: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});
