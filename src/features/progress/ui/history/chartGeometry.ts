import { Skia } from '@shopify/react-native-skia';

export const CHART_HEIGHT = 160;
export const CHART_PADDING = { top: 12, bottom: 12, left: 4, right: 8 };

export interface ChartPoint {
  x: number;
  y: number;
}

/** straight segments through the points — mastery only moves on practiced days, so no curve invents a path */
export function polyline(points: ChartPoint[]) {
  const path = Skia.Path.Make();
  points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  return path;
}

/** the same line closed down to the baseline, for the soft fill beneath it */
export function areaUnder(points: ChartPoint[], baseline: number) {
  const path = polyline(points);
  if (points.length > 1) {
    path.lineTo(points[points.length - 1].x, baseline);
    path.lineTo(points[0].x, baseline);
    path.close();
  }
  return path;
}
