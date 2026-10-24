import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { translatedRecord } from '@/shared/i18n';
import { HISTORY_RANGES, type HistoryRange } from '../../lib/series';

const RANGE_LABELS = translatedRecord<HistoryRange>({
  '4w': 'progress.history.range.4w',
  '3m': 'progress.history.range.3m',
  '6m': 'progress.history.range.6m',
  '1y': 'progress.history.range.1y',
});

/** the chart's time span: 4 weeks … 1 year */
export function RangeTabs({ value, onChange }: { value: HistoryRange; onChange: (range: HistoryRange) => void }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {HISTORY_RANGES.map((r) => {
        const active = r === value;
        return (
          <Pressable
            key={r}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(r)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <AppText variant="caption" weight="medium" center color={active ? palette.inkOnAccent : palette.textSecondary}>
              {RANGE_LABELS[r]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: palette.surface },
  activeTab: { backgroundColor: palette.accent },
});
