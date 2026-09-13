/**
 * A compact 4-week mastery sparkline. Draws a single smooth line showing
 * the average mastery across all skills for each recent week snapshot.
 * Designed to fit inside a stats card (48px tall, full width).
 */
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Canvas, Circle, Path, Skia, vec } from '@shopify/react-native-skia';
import type { SkillId } from '@/features/learning';

export interface SparklinePoint {
  weekKey: string;
  mastery: Partial<Record<SkillId, number>>;
}

const HEIGHT = 48;
const PAD_X = 4;
const PAD_Y = 8;

function avgMastery(m: Partial<Record<string, number>>): number {
  const vals = Object.values(m).filter((v): v is number => v !== undefined);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function MasterySparkline({
  snapshots,
  color = '#C8DA59',
  weeks = 4,
}: {
  snapshots: SparklinePoint[];
  color?: string;
  weeks?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const visible = snapshots.slice(0, weeks).reverse(); // oldest first
  if (visible.length < 2 || width <= 0) {
    return <View onLayout={onLayout} style={{ height: HEIGHT }} />;
  }

  const values = visible.map((s) => avgMastery(s.mastery));
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const range = max - min || 1;

  const chartW = width - PAD_X * 2;
  const chartH = HEIGHT - PAD_Y * 2;

  const points = values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * chartW,
    y: PAD_Y + chartH - ((v - min) / range) * chartH,
  }));

  // Build smooth path
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.3;
    path.cubicTo(
      p1.x + (p2.x - p0.x) * t,
      p1.y + (p2.y - p0.y) * t,
      p2.x - (p3.x - p1.x) * t,
      p2.y - (p3.y - p1.y) * t,
      p2.x,
      p2.y,
    );
  }

  const last = points[points.length - 1];

  return (
    <View onLayout={onLayout} style={{ height: HEIGHT }}>
      {width > 0 && (
        <Canvas style={{ width, height: HEIGHT }}>
          <Path
            path={path}
            color={color}
            style="stroke"
            strokeWidth={2}
            strokeCap="round"
            strokeJoin="round"
          />
          <Circle cx={last.x} cy={last.y} r={3} color={color} />
        </Canvas>
      )}
    </View>
  );
}
