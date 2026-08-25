/**
 * Edge glow that responds to microphone volume and pitch accuracy.
 *
 * Four radial-ish gradient strips sit on the screen edges (top, bottom, left,
 * right). Their opacity is driven by a reanimated shared value that tracks the
 * live RMS from the pitch pipeline — louder singing → brighter glow, silence →
 * invisible.
 *
 * Color reflects pitch accuracy via `micGlowTier`: blue (default/no pitch),
 * green (in tune), orange (slightly off), red (off).
 *
 * The component reads shared values from `micRmsBus` so it never causes React
 * re-renders.
 */
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { micActive, micGlowTier, micRms } from '@/shared/lib/micRmsBus';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** RMS below this is treated as silence (matches the YIN gate). */
const RMS_FLOOR = 0.004;

/**
 * RMS at which the glow reaches full intensity. Typical singing sits around
 * 0.05–0.15; this ceiling keeps the glow responsive without requiring a scream.
 */
const RMS_CEILING = 0.12;

const MIN_OPACITY = 0.08;
const MAX_OPACITY = 0.55;

const EDGE_SIZE = 60;

function rmsToOpacity(rms: number): number {
  'worklet';
  const t = Math.min(1, Math.max(0, (rms - RMS_FLOOR) / (RMS_CEILING - RMS_FLOOR)));
  const eased = 1 - (1 - t) * (1 - t);
  return MIN_OPACITY + eased * (MAX_OPACITY - MIN_OPACITY);
}

/** tier → [solid, transparent] color pair */
const TIER_COLORS = {
  0: { solid: '#5B8DEF', transparent: 'rgba(91, 141, 239, 0)' },   // blue (default)
  1: { solid: '#C8DA59', transparent: 'rgba(200, 218, 89, 0)' },   // in tune
  2: { solid: '#f0954a', transparent: 'rgba(240, 149, 74, 0)' },   // slightly off
  3: { solid: '#ff6d5c', transparent: 'rgba(255, 109, 92, 0)' },   // off
} as const;

type Tier = keyof typeof TIER_COLORS;

function GlowLayer({ tier }: { tier: Tier }) {
  const { solid, transparent } = TIER_COLORS[tier];
  const style = useAnimatedStyle(() => ({
    opacity: micActive.value && micGlowTier.value === tier ? rmsToOpacity(micRms.value) : 0,
  }));

  return (
    <Animated.View style={[styles.container, style]} pointerEvents="none">
      <AnimatedGradient
        colors={[solid, transparent]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.top}
      />
      <AnimatedGradient
        colors={[transparent, solid]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottom}
      />
      <AnimatedGradient
        colors={[solid, transparent]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.left}
      />
      <AnimatedGradient
        colors={[transparent, solid]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.right}
      />
    </Animated.View>
  );
}

export function MicGlow() {
  return (
    <>
      <GlowLayer tier={0} />
      <GlowLayer tier={1} />
      <GlowLayer tier={2} />
      <GlowLayer tier={3} />
    </>
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
