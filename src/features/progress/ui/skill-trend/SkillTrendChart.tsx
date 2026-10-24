/**
 * Skia line chart showing mastery trends over time for selected skills.
 * Uses cubic Bezier interpolation for smooth curves. Supports multiple
 * time ranges and skill line toggling.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Line, Path, vec } from '@shopify/react-native-skia';
import type { SkillId } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { CHART_HEIGHT, CHART_PADDING, formatWeekKey, useSkillTrend, type SnapshotPoint } from './useSkillTrend';
import { RangeTabs } from './RangeTabs';
import { SkillLegend } from './SkillLegend';

export function SkillTrendChart({ snapshots, skills }: { snapshots: SnapshotPoint[]; skills: SkillId[] }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const { range, setRange, selected, toggleSkill, visible, lines, gridYs } = useSkillTrend(snapshots, skills, width);

  if (snapshots.length < 2) {
    return (
      <AppText variant="caption" center style={styles.empty}>
        {t('progress.charts.skillsEmpty')}
      </AppText>
    );
  }

  return (
    <View>
      <RangeTabs value={range} onChange={setRange} />

      <View onLayout={onLayout} style={styles.chart}>
        {width > 0 && (
          <Canvas style={[styles.chart, { width }]}>
            {gridYs.map((y) => (
              <Line key={y} p1={vec(CHART_PADDING.left, y)} p2={vec(width - CHART_PADDING.right, y)} color={GRID} strokeWidth={1} />
            ))}
            {lines.map((l) => (
              <Path key={l.skill} path={l.path} color={l.color} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
            ))}
          </Canvas>
        )}
      </View>

      {visible.length > 0 && (
        <View style={styles.axis}>
          <AppText variant="caption">{formatWeekKey(visible[0].weekKey)}</AppText>
          <AppText variant="caption">{formatWeekKey(visible[visible.length - 1].weekKey)}</AppText>
        </View>
      )}

      <SkillLegend skills={skills} selected={selected} onToggle={toggleSkill} />
    </View>
  );
}

const GRID = whiteAlpha(0.08);

const styles = StyleSheet.create({
  empty: { paddingVertical: spacing.lg },
  chart: { height: CHART_HEIGHT },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: CHART_PADDING.left, marginTop: 2 },
});
