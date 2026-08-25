import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { useTheme } from '@/shared/theme';

/**
 * Full-screen radial gradient backdrop.
 *
 * Replicates: radial-gradient(102.43% 117.66% at 107.21% -18.99%,
 *   #F2FFC2 0%, rgba(121,134,255,0.4) 31.25%, rgba(30,30,30,0.4) 100%)
 *
 * The elliptical shape is achieved by scaling the y-axis about the gradient
 * center before drawing the (circular) RadialGradient, then letting Skia
 * stretch it back to screen coordinates.
 */
export function AppBackground() {
  const { gradient } = useTheme();
  const { width, height } = useWindowDimensions();

  // Gradient center and ellipse radii expressed as fractions of screen size
  const cx = width * 0.5;
  const cy = height * -0.8;
  const rx = width * 1;   // horizontal semi-axis
  const ry = height * 1.2;  // vertical semi-axis
  const scaleY = (ry / rx) * 1.2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Group
          transform={[
            { translateX: cx },
            { translateY: cy },
            { scaleY },
            { translateX: -cx },
            { translateY: -cy },
          ]}
        >
          <Fill>
            <RadialGradient
              c={vec(cx, cy)}
              r={rx}
              colors={[...gradient.screenBg]}
              positions={[0, 0.3125, 1]}
            />
          </Fill>
        </Group>
      </Canvas>
    </View>
  );
}
