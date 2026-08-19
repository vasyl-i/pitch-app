import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { HeatmapEntry } from '../lib/stats';

/**
 * Which notes you consistently sing sharp or flat. Each note is a column; the
 * marker sits above centre when you tend sharp, below when flat, and its
 * colour deepens with the size of the bias.
 */
export function NoteHeatmap({ data }: { data: HeatmapEntry[] }) {
  const { palette, radii } = useTheme();
  const H = 92;
  const mid = H / 2;
  const maxCents = 40;

  if (data.length === 0) {
    return (
      <AppText variant="caption" style={{ paddingVertical: 12 }}>
        Sing a few exercises and your sharp/flat tendencies will show up here.
      </AppText>
    );
  }

  return (
    <View>
      <View style={[styles.chart, { height: H }]}>
        <View style={[styles.midline, { top: mid }]} />
        {data.map((e) => {
          const clamped = Math.max(-maxCents, Math.min(maxCents, e.avgCents));
          const offset = (clamped / maxCents) * (mid - 12);
          const severity = Math.min(1, Math.abs(e.avgCents) / 25);
          const color = severity < 0.4 ? palette.accent : severity < 0.75 ? palette.warning : palette.danger;
          return (
            <View key={e.pitchClass} style={styles.col}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: color, borderRadius: radii.pill, top: mid - offset - 5, opacity: 0.45 + severity * 0.55 },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((e) => (
          <View key={e.pitchClass} style={styles.col}>
            <AppText variant="caption" style={{ fontSize: 10 }}>
              {e.name}
            </AppText>
            <AppText variant="caption" color={Math.abs(e.avgCents) < 10 ? palette.textFaint : palette.textSecondary} style={{ fontSize: 9 }}>
              {e.avgCents > 0 ? '+' : ''}
              {Math.round(e.avgCents)}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          ↑ sharp · ↓ flat · last 30 days
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' },
  midline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  col: { flex: 1, alignItems: 'center' },
  dot: { position: 'absolute', width: 10, height: 10 },
  labels: { flexDirection: 'row', marginTop: 6 },
  legend: { marginTop: 8 },
});
