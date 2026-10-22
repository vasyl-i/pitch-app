import { View } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
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
  const { typography, spacing } = useTheme();

  const items: StatItem[] = [
    {
      value: accuracy === null ? '—' : `${accuracy}`,
      unit: accuracy === null ? undefined : '%',
      label: t('home.stats.accuracy'),
    },
    {
      value: t('common.daysShort', { count: streak }),
      label: t('home.stats.inARow'),
    },
    {
      value: practiceLabel,
      label: t('home.stats.practiceTime'),
    },
  ];

  return (
    <View style={{ flexDirection: 'row' }}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            minWidth: 0,
            paddingLeft: index === 0 ? 0 : spacing.md,
            paddingRight: index === items.length - 1 ? 0 : spacing.md,
            borderLeftWidth: index === 0 ? 0 : 1,
            borderLeftColor: 'rgba(255, 255, 255, 0.14)',
          }}
        >
          <AppText color={todayColor.inkSecondary} variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
            {item.label}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <AppText color={todayColor.ink} style={{ fontFamily: typography.family.bold, fontSize: 19, letterSpacing: -0.3 }}>
              {item.value}
            </AppText>
            {item.unit && (
              <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 12, marginLeft: 2 }}>
                {item.unit}
              </AppText>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
