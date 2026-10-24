/**
 * A 0–100 value over a date range — skill mastery as it stood at the close
 * of each practiced day, held flat to today. Skia, drawn once per layout.
 */
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Circle, Line, Path, vec } from '@shopify/react-native-skia';
import { accentAlpha, palette, whiteAlpha } from '@/shared/theme';
import { isoDayStart } from '../../lib/history';
import { areaUnder, CHART_HEIGHT, CHART_PADDING, polyline, type ChartPoint } from './chartGeometry';

export interface DayValue {
  day: string;
  value: number;
}

const GRID_VALUES = [25, 50, 75];

export function HistoryLineChart({ points, startDay, endDay }: { points: DayValue[]; startDay: string; endDay: string }) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);

  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const yOf = (value: number) => CHART_PADDING.top + chartH - (value / 100) * chartH;
  const baseline = yOf(0);

  const { line, area, last } = useMemo(() => {
    const from = isoDayStart(startDay);
    const span = Math.max(1, isoDayStart(endDay) - from);
    const chartW = width - CHART_PADDING.left - CHART_PADDING.right;
    const xy: ChartPoint[] = points.map((p) => ({
      x: CHART_PADDING.left + ((isoDayStart(p.day) - from) / span) * chartW,
      y: yOf(p.value),
    }));
    return { line: polyline(xy), area: areaUnder(xy, baseline), last: xy[xy.length - 1] };
  }, [points, startDay, endDay, width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View onLayout={onLayout} style={styles.chart}>
      {width > 0 && (
        <Canvas style={[styles.chart, { width }]}>
          {GRID_VALUES.map((v) => (
            <Line key={v} p1={vec(CHART_PADDING.left, yOf(v))} p2={vec(width - CHART_PADDING.right, yOf(v))} color={GRID} strokeWidth={1} />
          ))}
          <Path path={area} color={FILL} />
          <Path path={line} color={palette.accent} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
          {last && <Circle cx={last.x} cy={last.y} r={4} color={palette.accent} />}
        </Canvas>
      )}
    </View>
  );
}

const GRID = whiteAlpha(0.08);
const FILL = accentAlpha(0.12);

const styles = StyleSheet.create({
  chart: { height: CHART_HEIGHT },
});
