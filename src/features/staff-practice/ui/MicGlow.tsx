/**
 * Static blue edge glow shown when the microphone is active.
 *
 * Voice-reactive intensity and pitch-tier coloring are temporarily disabled.
 * The glow appears at a constant subtle opacity as a visual signal that the
 * app is listening for the singer's voice.
 */
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { micActive } from '@/shared/lib/micRmsBus';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const EDGE_SIZE = 60;
const STATIC_OPACITY = 0.15;

const BLUE_SOLID = '#5B8DEF';
const BLUE_TRANSPARENT = 'rgba(91, 141, 239, 0)';

export function MicGlow() {
  const style = useAnimatedStyle(() => ({
    opacity: micActive.value ? STATIC_OPACITY : 0,
  }));

  return (
    <Animated.View style={[styles.container, style]} pointerEvents="none">
      <AnimatedGradient
        colors={[BLUE_SOLID, BLUE_TRANSPARENT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.top}
      />
      <AnimatedGradient
        colors={[BLUE_TRANSPARENT, BLUE_SOLID]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottom}
      />
      <AnimatedGradient
        colors={[BLUE_SOLID, BLUE_TRANSPARENT]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.left}
      />
      <AnimatedGradient
        colors={[BLUE_TRANSPARENT, BLUE_SOLID]}
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
