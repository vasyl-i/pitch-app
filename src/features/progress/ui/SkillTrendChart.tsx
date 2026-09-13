/**
 * Skia line chart showing mastery trends over time for selected skills.
 * Uses cubic Bezier interpolation for smooth curves. Supports multiple
 * time ranges and skill line toggling.
 */
import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Canvas, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import type { SkillId } from '@/features/learning';
import { SKILL_LABELS } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';

export interface SnapshotPoint {
  weekKey: string;
  mastery: Partial<Record<SkillId, number>>;
}

type TimeRange = '4w' | '3m' | '6m' | '1y';
const RANGE_WEEKS: Record<TimeRange, number> = { '4w': 4, '3m': 13, '6m': 26, '1y': 52 };
const RANGE_LABELS: TimeRange[] = ['4w', '3m', '6m', '1y'];

const CHART_HEIGHT = 160;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;

const LINE_COLORS: string[] = [
  '#C8DA59', // lime (accent)
  '#6FA0E8', // blue
  '#B79FE8', // lavender
  '#EE8672', // coral
  '#F3C79B', // peach
  '#7B7FE0', // indigo
];

/** Build a smooth cubic Bezier path through data points. */
function buildSmoothPath(
  points: { x: number; y: number }[],
): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  if (points.length < 2) return path;

  path.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y);
    return path;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path.cubicTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  return path;
}

export function SkillTrendChart({
  snapshots,
  skills,
}: {
  snapshots: SnapshotPoint[];
  skills: SkillId[];
}) {
  const { palette, spacing, typography, radii } = useTheme();
  const [range, setRange] = useState<TimeRange>('3m');
  const [selected, setSelected] = useState<Set<SkillId>>(() => new Set(skills.slice(0, 3)));
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const toggleSkill = (skill: SkillId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        if (next.size > 1) next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const maxWeeks = RANGE_WEEKS[range];
  const visibleSnapshots = useMemo(
    () => snapshots.slice(0, maxWeeks).reverse(), // oldest first for chart
    [snapshots, maxWeeks],
  );

  const chartW = width - PADDING_LEFT - PADDING_RIGHT;
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const paths = useMemo(() => {
    if (visibleSnapshots.length < 2 || chartW <= 0) return [];

    const activeSkills = [...selected];
    return activeSkills.map((skill, i) => {
      const points = visibleSnapshots
        .map((s, idx) => {
          const val = s.mastery[skill];
          if (val === undefined) return null;
          return {
            x: PADDING_LEFT + (idx / (visibleSnapshots.length - 1)) * chartW,
            y: PADDING_TOP + chartH - (val / 100) * chartH,
          };
        })
        .filter(Boolean) as { x: number; y: number }[];

      return {
        skill,
        path: buildSmoothPath(points),
        color: LINE_COLORS[i % LINE_COLORS.length],
      };
    });
  }, [visibleSnapshots, selected, chartW, chartH]);

  // Y-axis grid lines at 25, 50, 75
  const gridLines = [25, 50, 75].map((val) => ({
    y: PADDING_TOP + chartH - (val / 100) * chartH,
    label: `${val}`,
  }));

  if (snapshots.length < 2) {
    return (
      <View style={{ paddingVertical: spacing.lg }}>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Practice for a couple of weeks to see your skill trends here.
        </AppText>
      </View>
    );
  }

  return (
    <View>
      {/* Time range selector */}
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
        {RANGE_LABELS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radii.sm,
              backgroundColor: r === range ? palette.accent : 'rgba(255,255,255,0.06)',
            }}
          >
            <AppText
              style={{
                fontFamily: typography.family.medium,
                fontSize: 12,
                color: r === range ? '#171B08' : palette.textSecondary,
              }}
            >
              {r}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Chart */}
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
        {width > 0 && (
          <Canvas style={{ width, height: CHART_HEIGHT }}>
            {/* Grid lines */}
            <Group>
              {gridLines.map((g) => (
                <Line
                  key={g.label}
                  p1={vec(PADDING_LEFT, g.y)}
                  p2={vec(width - PADDING_RIGHT, g.y)}
                  color="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
              ))}
            </Group>

            {/* Skill paths */}
            <Group>
              {paths.map((p) => (
                <Path
                  key={p.skill}
                  path={p.path}
                  color={p.color}
                  style="stroke"
                  strokeWidth={2.5}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
            </Group>
          </Canvas>
        )}
      </View>

      {/* X-axis labels */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: PADDING_LEFT,
          marginTop: 2,
        }}
      >
        {visibleSnapshots.length > 0 && (
          <>
            <AppText variant="caption" style={{ fontSize: 10, color: palette.textFaint }}>
              {formatWeekKey(visibleSnapshots[0].weekKey)}
            </AppText>
            <AppText variant="caption" style={{ fontSize: 10, color: palette.textFaint }}>
              {formatWeekKey(visibleSnapshots[visibleSnapshots.length - 1].weekKey)}
            </AppText>
          </>
        )}
      </View>

      {/* Skill legend chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md }}>
        {skills.map((skill, i) => {
          const active = selected.has(skill);
          const color = LINE_COLORS[
            [...selected].indexOf(skill) % LINE_COLORS.length
          ];
          return (
            <Pressable
              key={skill}
              onPress={() => toggleSkill(skill)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radii.sm,
                backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                opacity: active ? 1 : 0.45,
              }}
            >
              {active && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
              )}
              <AppText
                style={{
                  fontFamily: typography.family.regular,
                  fontSize: 11,
                  color: palette.textSecondary,
                }}
              >
                {SKILL_LABELS[skill]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatWeekKey(weekKey: string): string {
  // weekKey format is "YYYY-WXX" — show abbreviated
  const parts = weekKey.split('-');
  if (parts.length === 2 && parts[1]?.startsWith('W')) {
    return `W${parts[1].slice(1)}`;
  }
  return weekKey;
}
