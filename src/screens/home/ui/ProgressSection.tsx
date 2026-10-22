import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { formatPracticeTime } from '@/features/progress';
import { todayColor } from '../todayPalette';

const DIVIDER_COLOR = 'rgba(255, 255, 255, 0.14)';

interface Props {
  accuracy: number;
  streak: number;
  practiceTime: string;
}

export function ProgressSection({ accuracy, streak, practiceTime }: Props) {
  const { t } = useTranslation();
  const { typography, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.xl }}>
      <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 16 }}>
        {t('home.progress.title')}
      </AppText>
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Stat value={accuracy > 0 ? `${accuracy}%` : '—'} label={t('home.stats.accuracy')} />
        <Stat value={streak > 0 ? t('common.daysShort', { count: streak }) : '—'} label={t('home.stats.inARow')} divider />
        <Stat value={practiceTime && practiceTime !== formatPracticeTime(0) ? practiceTime : '—'} label={t('home.stats.practiceTime')} divider />
      </View>
    </View>
  );
}

function Stat({ value, label, divider = false }: { value: string; label: string; divider?: boolean }) {
  const { typography, spacing } = useTheme();

  return (
    <View
      style={[
        styles.stat,
        divider && { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: DIVIDER_COLOR, alignItems: 'center' as const },
      ]}
    >
      <View>
        <AppText
          color={todayColor.inkFaint}
          style={{ fontFamily: typography.family.regular, fontSize: 12, lineHeight: 18 }}
          numberOfLines={1}
        >
          {label}
        </AppText>
        <AppText
          color={todayColor.ink}
          style={{ fontFamily: typography.family.medium, fontSize: 26, lineHeight: 34, marginTop: 2 }}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
});
