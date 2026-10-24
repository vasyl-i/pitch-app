import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { TIME_RANGES, type TimeRange } from './useSkillTrend';

/** the chart's time span: 4 weeks … 1 year */
export function RangeTabs({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <View style={styles.row}>
      {TIME_RANGES.map((r) => {
        const active = r === value;
        return (
          <Pressable key={r} onPress={() => onChange(r)} style={[styles.tab, active && styles.activeTab]}>
            <AppText variant="caption" weight="medium" color={active ? palette.inkOnAccent : palette.textSecondary}>
              {r}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.sm, backgroundColor: palette.surface },
  activeTab: { backgroundColor: palette.accent },
});
