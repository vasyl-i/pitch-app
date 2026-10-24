import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { formatPracticeTime } from '@/features/progress';
import { todayColor } from '../todayPalette';

interface Props {
  accuracy: number;
  streak: number;
  practiceTime: string;
}

/** "Your progress": accuracy, streak and practice time in three columns */
export function ProgressSection({ accuracy, streak, practiceTime }: Props) {
  const { t } = useTranslation();
  const hasPracticeTime = practiceTime && practiceTime !== formatPracticeTime(0);

  return (
    <View style={styles.section}>
      <AppText variant="label" weight="medium" color={todayColor.ink}>
        {t('home.progress.title')}
      </AppText>
      <View style={styles.row}>
        <Stat value={accuracy > 0 ? `${accuracy}%` : '—'} label={t('home.stats.accuracy')} />
        <Stat value={streak > 0 ? t('common.daysShort', { count: streak }) : '—'} label={t('home.stats.inARow')} divider />
        <Stat value={hasPracticeTime ? practiceTime : '—'} label={t('home.stats.practiceTime')} divider />
      </View>
    </View>
  );
}

function Stat({ value, label, divider = false }: { value: string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.divided]}>
      <View>
        <AppText variant="caption" color={todayColor.inkFaint} numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="title" weight="medium" color={todayColor.ink} style={styles.value}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  row: { flexDirection: 'row', marginTop: spacing.md },
  stat: { flex: 1, minWidth: 0 },
  divided: { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: whiteAlpha(0.14), alignItems: 'center' },
  value: { marginTop: 2 },
});
