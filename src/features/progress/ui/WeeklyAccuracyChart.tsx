import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { WeeklyAccuracyPoint } from '../lib/stats';

/** Average accuracy per week as bars — is the singer trending up across weeks? */
export function WeeklyAccuracyChart({ points }: { points: WeeklyAccuracyPoint[] }) {
  const { palette, radii, gradient } = useTheme();
  const weeksWithData = points.filter((p) => p.avgScore !== null).length;

  if (weeksWithData < 2) {
    return (
      <AppText variant="caption" style={{ paddingVertical: 12 }}>
        Practice across a couple of weeks to see your accuracy trend.
      </AppText>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {points.map((p, i) => {
          const opacity = i === points.length - 1 ? 1 : 0.55;
          return (
            <View key={p.weekStart} style={styles.slot}>
              {p.avgScore === null ? (
                <View style={[styles.empty, { backgroundColor: palette.borderSubtle, borderRadius: radii.sm }]} />
              ) : p.avgScore >= 90 ? (
                <LinearGradient
                  colors={gradient.accent}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={[styles.bar, { height: `${Math.max(6, p.avgScore)}%`, borderRadius: radii.sm, opacity }]}
                />
              ) : (
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(6, p.avgScore)}%`,
                      backgroundColor: p.avgScore >= 70 ? palette.warning : palette.danger,
                      borderRadius: radii.sm,
                      opacity,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          {points.length} weeks ago
        </AppText>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          this week
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 4 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  empty: { width: '100%', height: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
