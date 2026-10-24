import { StyleSheet, View } from 'react-native';
import { voiceType, type VocalProfile } from '@/entities/profile';
import { RangeBar } from '@/features/vocal-range';
import { midiToName } from '@/shared/lib/music';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { formatDate, useTranslation } from '@/shared/i18n';

/** the comfortable range, where it sits on the full span, how it was measured, and any off-day reduction */
export function RangeSummaryCard({ profile }: { profile: VocalProfile }) {
  const { t } = useTranslation();
  const { comfortRange, trainingRange, maximumRange } = profile;
  const reduced = trainingRange.lowMidi !== comfortRange.lowMidi || trainingRange.highMidi !== comfortRange.highMidi;

  return (
    <Card style={styles.card}>
      <AppText variant="caption">{t('vocalRange.settings.comfortable')}</AppText>
      <AppText variant="title" style={styles.range}>
        {midiToName(comfortRange.lowMidi)} – {midiToName(comfortRange.highMidi)}
      </AppText>
      <View style={styles.bar}>
        <RangeBar lowMidi={maximumRange.lowMidi} highMidi={maximumRange.highMidi} currentMidi={null} />
      </View>
      <AppText variant="caption" style={styles.note}>
        {t('vocalRange.settings.meta', {
          voice: voiceType(comfortRange),
          confidence: Math.round(profile.confidence * 100),
          date: formatDate(new Date(profile.detectedAt), { dateStyle: 'medium' }),
        })}
      </AppText>
      {reduced && (
        <AppText variant="caption" color={palette.warning} style={styles.note}>
          {t('vocalRange.settings.reduced', { low: midiToName(trainingRange.lowMidi), high: midiToName(trainingRange.highMidi) })}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, marginTop: spacing.lg },
  range: { marginTop: spacing.xs },
  bar: { marginTop: spacing.md },
  note: { marginTop: spacing.sm },
});
