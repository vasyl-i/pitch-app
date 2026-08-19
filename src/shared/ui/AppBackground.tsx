import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Blur, Canvas, Circle, Fill, Group } from '@shopify/react-native-skia';
import { useTheme } from '@/shared/theme';

type Blob = { xt: number; yt: number; r: number; color: string; opacity: number };

/**
 * The app's default backdrop — a handful of oversized, heavily blurred color
 * fields parked along the top corners so they read as clearly-visible
 * colored light bleeding in, softened by blur so there's no hard edge or
 * visible circle. The center, where cards sit, stays close to flat black so
 * content keeps contrast. Originated on the Today screen; every screen using
 * the default `Screen` backdrop now gets the identical composition.
 */
export function AppBackground() {
  const { palette, glow } = useTheme();
  const { width, height } = useWindowDimensions();

  const blobs: Blob[] = [
    { xt: -0.15, yt: -0.22, r: 260, color: glow.indigo, opacity: 0.62 },
    { xt: 0.5, yt: -0.3, r: 230, color: glow.lavender, opacity: 0.45 },
    { xt: 1.12, yt: -0.16, r: 260, color: glow.blue, opacity: 0.5 },
    { xt: 1.1, yt: 0.34, r: 180, color: glow.coral, opacity: 0.16 },
    { xt: -0.1, yt: 0.4, r: 180, color: glow.peach, opacity: 0.12 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color={palette.background} />
        <Group layer>
          {blobs.map((b, i) => (
            <Circle key={i} cx={width * b.xt} cy={height * b.yt} r={b.r} color={b.color} opacity={b.opacity} />
          ))}
          <Blur blur={95} />
        </Group>
      </Canvas>
    </View>
  );
}
