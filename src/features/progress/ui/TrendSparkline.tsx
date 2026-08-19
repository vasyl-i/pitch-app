import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';

/** Recent phrase scores as simple bars — improvement at a glance. */
export function TrendSparkline({ scores }: { scores: number[] }) {
  const { palette, radii, gradient } = useTheme();

  if (scores.length < 2) {
    return (
      <AppText variant="caption" style={{ paddingVertical: 12 }}>
        Complete a couple of phrases to see your trend.
      </AppText>
    );
  }

  return (
    <View style={styles.row}>
      {scores.map((score, i) => {
        const good = score >= 90;
        const opacity = i === scores.length - 1 ? 1 : 0.55;
        return (
          <View key={i} style={styles.slot}>
            {good ? (
              <LinearGradient
                colors={gradient.accent}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[styles.bar, { height: `${Math.max(6, score)}%`, borderRadius: radii.sm, opacity }]}
              />
            ) : (
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(6, score)}%`,
                    backgroundColor: score >= 70 ? palette.warning : palette.danger,
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 4 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
});
