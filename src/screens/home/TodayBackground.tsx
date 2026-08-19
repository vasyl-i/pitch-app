import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Blur, Canvas, Circle, Fill, Group } from '@shopify/react-native-skia';
import { todayColor } from './todayPalette';

type Blob = { xt: number; yt: number; r: number; color: string; opacity: number };

/**
 * Today's own backdrop: a handful of oversized, heavily blurred color fields
 * parked along the edges so they read as clearly-visible colored light —
 * like light passing through glass — bleeding in from the corners, softened
 * by blur so there's no hard edge or visible circle. The center, where cards
 * sit, stays closer to flat black so content keeps contrast. Scoped to this
 * screen via `Screen`'s `backdrop` prop; every other screen keeps the shared
 * dark-glass system untouched.
 */
export function TodayBackground() {
  const { width, height } = useWindowDimensions();

  const blobs: Blob[] = [
    { xt: -0.15, yt: -0.22, r: 260, color: todayColor.indigo, opacity: 0.62 },
    { xt: 0.5, yt: -0.3, r: 230, color: todayColor.lavender, opacity: 0.45 },
    { xt: 1.12, yt: -0.16, r: 260, color: todayColor.blue, opacity: 0.5 },
    { xt: 1.1, yt: 0.34, r: 180, color: todayColor.coral, opacity: 0.16 },
    { xt: -0.1, yt: 0.4, r: 180, color: todayColor.peach, opacity: 0.12 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color={todayColor.bg} />
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
