/**
 * Edge glow that responds to microphone volume during mic-active stages.
 *
 * Four radial-ish gradient strips sit on the screen edges (top, bottom, left,
 * right). Their opacity is driven by a reanimated shared value that tracks the
 * live RMS from the pitch pipeline — louder singing → brighter glow, silence →
 * a faint ambient hint that the mic is listening.
 *
 * The component reads RMS from the global `micRms` shared value bus
 * (`shared/lib/micRmsBus`) so it never causes React re-renders.
 *
 * The component is absolutely positioned and pointer-events-transparent so it
 * sits over the practice UI without intercepting touches.
 */
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { palette } from '@/shared/theme/tokens';
import { micActive, micRms } from '@/shared/lib/micRmsBus';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** RMS below this is treated as silence (matches the YIN gate). */
const RMS_FLOOR = 0.004;

/**
 * RMS at which the glow reaches full intensity. Typical singing sits around
 * 0.05–0.15; this ceiling keeps the glow responsive without requiring a scream.
 */
const RMS_CEILING = 0.12;

/** Minimum opacity so the glow is always faintly visible when mounted. */
const MIN_OPACITY = 0.08;
const MAX_OPACITY = 0.55;

const EDGE_SIZE = 60;

/**
 * Map raw RMS (0 → ~0.3) to a glow opacity.
 * Clamped and eased so the response feels organic rather than twitchy.
 */
function rmsToOpacity(rms: number): number {
  'worklet';
  const t = Math.min(1, Math.max(0, (rms - RMS_FLOOR) / (RMS_CEILING - RMS_FLOOR)));
  // ease-out quad for a gentle rise
  const eased = 1 - (1 - t) * (1 - t);
  return MIN_OPACITY + eased * (MAX_OPACITY - MIN_OPACITY);
}

const ACCENT_TRANSPARENT = 'rgba(200, 218, 89, 0)';

export function MicGlow() {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: micActive.value ? rmsToOpacity(micRms.value) : 0,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      {/* top edge */}
      <AnimatedGradient
        colors={[palette.accent, ACCENT_TRANSPARENT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.top}
      />
      {/* bottom edge */}
      <AnimatedGradient
        colors={[ACCENT_TRANSPARENT, palette.accent]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottom}
      />
      {/* left edge */}
      <AnimatedGradient
        colors={[palette.accent, ACCENT_TRANSPARENT]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.left}
      />
      {/* right edge */}
      <AnimatedGradient
        colors={[ACCENT_TRANSPARENT, palette.accent]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.right}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: EDGE_SIZE,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: EDGE_SIZE,
  },
  left: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: EDGE_SIZE,
  },
  right: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: EDGE_SIZE,
  },
});
