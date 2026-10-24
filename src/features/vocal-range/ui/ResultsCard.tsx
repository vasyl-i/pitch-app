import { StyleSheet } from 'react-native';
import { AppText, ScoreBoard } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { midiToName } from '@/shared/lib/music';
import { voiceType } from '@/entities/profile';
import { formatNumber, useTranslation } from '@/shared/i18n';

/** Celebratory-but-professional summary of a completed low/high detection. */
export function ResultsCard({ low, high, success }: { low: number; high: number; success?: boolean }) {
  const { t } = useTranslation();
  const span = high - low;
  const octaves = formatNumber(span / 12, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <ScoreBoard success={!!success}>
      <AppText variant="caption" color={palette.textSecondaryElevated}>
        {t('vocalRange.results.comfortable')}
      </AppText>
      <AppText variant="score" color={palette.accent} style={styles.range}>
        {`${midiToName(low)} — ${midiToName(high)}`}
      </AppText>
      <AppText variant="caption" color={palette.textSecondaryElevated}>
        {`${t('vocalRange.semitones', { count: span })} · ${t('vocalRange.octaves', { value: octaves })} · ≈${voiceType({ lowMidi: low, highMidi: high })}`}
      </AppText>
    </ScoreBoard>
  );
}

const styles = StyleSheet.create({
  // the original spacing between the three lines
  range: { marginVertical: spacing.xs },
});
