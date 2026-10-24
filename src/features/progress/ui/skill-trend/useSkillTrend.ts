import { useMemo, useState } from 'react';
import { Skia } from '@shopify/react-native-skia';
import type { SkillId } from '@/features/learning';
import { glow, palette } from '@/shared/theme';

export interface SnapshotPoint {
  weekKey: string;
  mastery: Partial<Record<SkillId, number>>;
}

export type TimeRange = '4w' | '3m' | '6m' | '1y';
export const TIME_RANGES: TimeRange[] = ['4w', '3m', '6m', '1y'];
const RANGE_WEEKS: Record<TimeRange, number> = { '4w': 4, '3m': 13, '6m': 26, '1y': 52 };

export const CHART_HEIGHT = 160;
export const CHART_PADDING = { top: 12, bottom: 24, left: 8, right: 8 };

/** a line per selected skill, in selection order */
const LINE_COLORS: string[] = [palette.accent, glow.blue, glow.lavender, glow.coral, glow.peach, glow.indigo];

export function lineColor(index: number): string {
  return LINE_COLORS[index % LINE_COLORS.length];
}

/**
 * The chart's state and geometry: the chosen time range, which skills are
 * drawn (at least one always), and a smoothed path per skill for the measured
 * width.
 */
export function useSkillTrend(snapshots: SnapshotPoint[], skills: SkillId[], width: number) {
  const [range, setRange] = useState<TimeRange>('3m');
  const [selected, setSelected] = useState<Set<SkillId>>(() => new Set(skills.slice(0, 3)));

  const toggleSkill = (skill: SkillId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.has(skill)) next.add(skill);
      else if (next.size > 1) next.delete(skill);
      return next;
    });

  const weeks = RANGE_WEEKS[range];
  // oldest first
  const visible = useMemo(() => snapshots.slice(0, weeks).reverse(), [snapshots, weeks]);

  const chartW = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const yOf = (value: number) => CHART_PADDING.top + chartH - (value / 100) * chartH;

  const lines = useMemo(() => {
    if (visible.length < 2 || chartW <= 0) return [];
    return [...selected].map((skill, i) => {
      const points = visible.flatMap((s, idx) => {
        const value = s.mastery[skill];
        return value === undefined
          ? []
          : [{ x: CHART_PADDING.left + (idx / (visible.length - 1)) * chartW, y: yOf(value) }];
      });
      return { skill, path: smoothPath(points), color: lineColor(i) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selected, chartW, chartH]);

  // horizontal guides at 25, 50 and 75
  const gridYs = useMemo(() => [25, 50, 75].map(yOf), [chartH]); // eslint-disable-line react-hooks/exhaustive-deps

  return { range, setRange, selected, toggleSkill, visible, lines, gridYs };
}

/** a smooth cubic Bézier through the points */
function smoothPath(points: { x: number; y: number }[]) {
  const path = Skia.Path.Make();
  if (points.length < 2) return path;
  path.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y);
    return path;
  }
  const tension = 0.3;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    path.cubicTo(
      p1.x + (p2.x - p0.x) * tension,
      p1.y + (p2.y - p0.y) * tension,
      p2.x - (p3.x - p1.x) * tension,
      p2.y - (p3.y - p1.y) * tension,
      p2.x,
      p2.y,
    );
  }
  return path;
}

/** "2026-W14" → "W14" */
export function formatWeekKey(weekKey: string): string {
  const parts = weekKey.split('-');
  return parts.length === 2 && parts[1]?.startsWith('W') ? `W${parts[1].slice(1)}` : weekKey;
}
