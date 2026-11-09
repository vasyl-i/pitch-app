/**
 * Static blue edge glow shown when the microphone is active: a soft frame
 * hugging the screen with rounded corners (one blurred path, not four
 * straight gradients whose ends meet in square corners).
 *
 * Voice-reactive intensity and pitch-tier coloring are temporarily disabled.
 * The glow appears at a constant subtle opacity as a visual signal that the
 * app is listening for the singer's voice.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { BlurMask, Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { micActive } from '@/shared/lib/micRmsBus';
import { glow } from '@/shared/theme';

const STATIC_OPACITY = 0.15;

/** how far the frame's inner edge sits from the screen edge — where the glow is at half strength */
const INSET = 16;
/** softness of the fade (Skia sigma): the glow has faded out about INSET + 2×BLUR from the edge */
const BLUR = 10;
/** corner radius of the frame's inner edge; the larger, the rounder the glow's corners */
const CORNER_RADIUS = 56;

export function MicGlow() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const style = useAnimatedStyle(() => ({
    opacity: micActive.value ? STATIC_OPACITY : 0,
  }));

  const path = useMemo(() => {
    const { width, height } = size;
    if (width === 0 || height === 0) return null;
    // the outer rect reaches past the screen so the blur never fades the frame at the very edge
    const bleed = BLUR * 3;
    const p = Skia.Path.Make();
    p.addRect(Skia.XYWHRect(-bleed, -bleed, width + bleed * 2, height + bleed * 2));
    p.addRRect(Skia.RRectXY(Skia.XYWHRect(INSET, INSET, width - INSET * 2, height - INSET * 2), CORNER_RADIUS, CORNER_RADIUS));
    return p;
  }, [size]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <Animated.View style={[styles.container, style]} pointerEvents="none" onLayout={onLayout}>
      <Canvas style={styles.canvas}>
        {path && (
          <Path path={path} color={glow.mic} fillType="evenOdd">
            <BlurMask blur={BLUR} style="normal" />
          </Path>
        )}
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  canvas: { flex: 1 },
});
