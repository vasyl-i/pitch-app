import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient, palette, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui';
import type { Bucket } from '../../lib/series';
import { CHART_HEIGHT } from './chartGeometry';

/**
 * Totals per bucket as bars against the range's best bucket, which is
 * labelled so the scale has a number on it. The newest bar is drawn solid.
 */
export function HistoryBarChart({ buckets, formatValue }: { buckets: Bucket[]; formatValue: (value: number) => string }) {
  const max = Math.max(...buckets.map((b) => b.value), 0);
  return (
    <View>
      <AppText variant="caption" style={styles.max}>
        {max > 0 ? formatValue(max) : ' '}
      </AppText>
      <View style={styles.row}>
        {buckets.map((b, i) => (
          <Bar key={b.start} share={max > 0 ? b.value / max : 0} latest={i === buckets.length - 1} />
        ))}
      </View>
    </View>
  );
}

function Bar({ share, latest }: { share: number; latest: boolean }) {
  return (
    <View style={styles.slot}>
      {share > 0 ? (
        <LinearGradient
          colors={gradient.accent}
          start={BOTTOM}
          end={TOP}
          style={[styles.bar, { height: `${Math.max(4, share * 100)}%`, opacity: latest ? 1 : 0.5 }]}
        />
      ) : (
        <View style={styles.empty} />
      )}
    </View>
  );
}

const BOTTOM = { x: 0, y: 1 };
const TOP = { x: 0, y: 0 };

const styles = StyleSheet.create({
  max: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT - 24, gap: 3 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: radii.sm / 2 },
  empty: { width: '100%', height: 3, borderRadius: radii.sm / 2, backgroundColor: palette.borderSubtle },
});
