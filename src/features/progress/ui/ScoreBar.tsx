import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient, palette, radii } from '@/shared/theme';

/**
 * One bar of a score chart, 0–100 filling its slot from the bottom: the
 * accent gradient from 90, warning from 70, danger below. The latest bar is
 * drawn solid, earlier ones faded.
 */
export function ScoreBar({ score, latest }: { score: number; latest: boolean }) {
  const size = { height: `${Math.max(6, score)}%` as const, opacity: latest ? 1 : 0.55 };
  return (
    <View style={styles.slot}>
      {score >= 90 ? (
        <LinearGradient colors={gradient.accent} start={BOTTOM} end={TOP} style={[styles.bar, size]} />
      ) : (
        <View style={[styles.bar, size, score >= 70 ? styles.warning : styles.danger]} />
      )}
    </View>
  );
}

/** a slot with no score: a thin baseline */
export function EmptyScoreBar() {
  return (
    <View style={styles.slot}>
      <View style={styles.empty} />
    </View>
  );
}

const BOTTOM = { x: 0, y: 1 };
const TOP = { x: 0, y: 0 };

const styles = StyleSheet.create({
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: radii.sm },
  warning: { backgroundColor: palette.warning },
  danger: { backgroundColor: palette.danger },
  empty: { width: '100%', height: 4, borderRadius: radii.sm, backgroundColor: palette.borderSubtle },
});
