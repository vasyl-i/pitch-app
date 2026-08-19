import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { colorForCents, NOTICEABLE_CENTS } from '@/shared/lib/music';

/** gauge half-span in cents — a bit past the "noticeable" band so the needle rarely pins */
const CLAMP_CENTS = NOTICEABLE_CENTS + 30;

/** Horizontal in-tune gauge: needle position and color both track cents deviation. */
export function CentsGauge({ cents }: { cents: number | null }) {
  const { palette, gradient } = useTheme();
  const clamped = cents === null ? 0 : Math.max(-CLAMP_CENTS, Math.min(CLAMP_CENTS, cents));
  const pct = 50 + (clamped / CLAMP_CENTS) * 50;
  const color = colorForCents(cents);
  const isAccent = color === palette.accent;

  return (
    <View>
      <View style={[styles.track, { backgroundColor: palette.borderSubtle }]}>
        <View style={[styles.center, { backgroundColor: palette.borderSubtle }]} />
        {cents !== null && (
          <View style={[styles.needle, { left: `${pct}%`, borderRadius: 2, overflow: 'hidden' }]}>
            {isAccent ? (
              <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
            )}
          </View>
        )}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          ♭ flat
        </AppText>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          in tune
        </AppText>
        <AppText variant="caption" style={{ fontSize: 10 }}>
          sharp ♯
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  center: { position: 'absolute', left: '50%', width: 2, height: '100%', marginLeft: -1 },
  needle: { position: 'absolute', top: -3, width: 4, height: 16, marginLeft: -2, borderRadius: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
