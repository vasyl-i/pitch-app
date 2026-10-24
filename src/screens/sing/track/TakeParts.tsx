import { StyleSheet, View } from 'react-native';
import { ACCURACY_COLOR, type FormingNote, type TakeScore } from '@/features/instrumental';
import { noteName } from '@/shared/lib/staff';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** the note being sung right now — its name and how it's landing */
export function LiveNote({ forming }: { forming: FormingNote | null }) {
  return (
    <View style={styles.readout}>
      <AppText variant="title" color={forming === null ? palette.textFaint : palette.textPrimary} style={styles.tabular}>
        {forming === null ? '—' : noteName(forming.laneMidi)}
      </AppText>
      <AppText variant="subtitle" weight="regular" color={forming === null ? palette.textFaint : ACCURACY_COLOR[forming.cls]} style={styles.tabular}>
        {forming === null ? '' : `${forming.medianCents > 0 ? '+' : ''}${forming.medianCents}¢`}
      </AppText>
    </View>
  );
}

/** the finished take's score and what it was made of */
export function TakeSummary({ score }: { score: TakeScore }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <AppText variant="headline" color={palette.accent}>
          {score.score}
        </AppText>
        <View style={styles.fill}>
          <AppText variant="label">{t('sing.track.takeScore')}</AppText>
          <AppText variant="caption" style={styles.detail}>
            {t('sing.track.takeSummary', { inKey: Math.round(score.inKeyFraction * 100), cents: score.avgCents, count: score.notes })}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.md, height: 34, marginTop: spacing.md },
  tabular: { fontVariant: ['tabular-nums'] },
  card: { padding: spacing.lg, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  fill: { flex: 1 },
  detail: { marginTop: 2 },
});
