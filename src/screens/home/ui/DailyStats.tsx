import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';

interface StatItem {
  value: string;
  unit?: string;
  label: string;
}

/** The three-up stat row — no card, no icons, columns divided by thin lines. */
export function DailyStats({ accuracy, streak, practiceLabel }: { accuracy: number | null; streak: number; practiceLabel: string }) {
  const { t } = useTranslation();
  const items: StatItem[] = [
    { value: accuracy === null ? '—' : `${accuracy}`, unit: accuracy === null ? undefined : '%', label: t('home.stats.accuracy') },
    { value: t('common.daysShort', { count: streak }), label: t('home.stats.inARow') },
    { value: practiceLabel, label: t('home.stats.practiceTime') },
  ];

  return (
    <View style={styles.row}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.column, index > 0 && styles.divided, index === items.length - 1 && styles.last]}>
          <AppText variant="caption" numberOfLines={1}>
            {item.label}
          </AppText>
          <View style={styles.valueRow}>
            <AppText variant="heading" color={todayColor.ink} style={styles.value}>
              {item.value}
            </AppText>
            {item.unit && (
              <AppText variant="caption" weight="medium" color={todayColor.ink} style={styles.unit}>
                {item.unit}
              </AppText>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  divided: { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: whiteAlpha(0.14) },
  last: { paddingRight: 0 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  value: { letterSpacing: -0.3 },
  unit: { marginLeft: 2 },
});
