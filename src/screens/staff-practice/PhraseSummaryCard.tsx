import { StyleSheet, View } from 'react-native';
import { AppText, Button, COMPACT_SCREEN, ScoreBoard } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { AttemptComparison, PhraseSummary } from '@/features/staff-practice';

interface SummaryAction {
  title: string;
  onPress: () => void;
}

/**
 * Post-phrase summary: the score on the mascot's board, then the host
 * screen's buttons — guided practice continues the lesson, free practice
 * goes again or leaves.
 *
 * The headline score is the *unaided* attempt — that is the one that
 * measures what was learned, and the one persisted to progress.
 */
export function PhraseSummaryCard({ summary, primary, secondary, tertiary, roundLabel }: {
  summary: PhraseSummary;
  /** which round this was, e.g. "Round 2 of 5", for exercises sung over several keys */
  roundLabel?: string;
  /** the assisted-vs-unaided comparison; not shown on this card yet */
  comparison?: AttemptComparison | null;
  primary: SummaryAction;
  secondary: SummaryAction;
  tertiary?: SummaryAction;
}) {
  const { t } = useTranslation();
  const stats = [
    t('staff.summary.metaDeviation', { cents: Math.round(summary.avgCents) }),
    t('staff.summary.metaRhythm', { rhythm: summary.rhythm }),
  ];

  return (
    <View style={styles.fill}>
      <View style={styles.result}>
        <AppText variant="small" color={palette.textSecondaryElevated} style={styles.title}>
          {roundLabel ? `${t('staff.summary.title')} · ${roundLabel}` : t('staff.summary.title')}
        </AppText>
        <ScoreBoard success={summary.score > 70}>
          <AppText variant="score" color={palette.accent}>{`${summary.score}%`}</AppText>
          {/* the small board is too narrow for one line: each stat gets its own */}
          <AppText variant="caption" color={palette.textSecondaryElevated} center>
            {stats.join(COMPACT_SCREEN ? '\n' : '  ·  ')}
          </AppText>
        </ScoreBoard>
      </View>

      <View style={styles.actions}>
        <Button title={primary.title} onPress={primary.onPress} />
        <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
        {tertiary && <Button title={tertiary.title} variant="transparent" onPress={tertiary.onPress} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  result: { flex: 1, alignItems: 'center', paddingTop: 80 },
  title: { marginBottom: spacing.md },
  actions: { paddingBottom: spacing.xl, gap: 20 },
});
