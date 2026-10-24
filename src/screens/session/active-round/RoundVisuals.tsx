import { Image, StyleSheet, View } from 'react-native';
import type { NoteOutcome, RoundScore, RoundVerdict } from '@/features/ear-training';
import { AppText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';


const MASCOTS: Record<RoundVerdict, number> = {
  love: require('../../../../assets/love-it.png'),
  almost: require('../../../../assets/almost.png'),
  retry: require('../../../../assets/try-once-more.png'),
  unheard: require('../../../../assets/couldnt-hear-you.png'),
};

const VERDICT_COLORS: Record<RoundVerdict, string> = {
  love: palette.accent,
  almost: palette.caution,
  retry: palette.danger,
  unheard: palette.textSecondaryElevated,
};

/** a big count (the hold before singing, the count-in) */
export function BigCount({ value, color }: { value: number; color: string }) {
  return (
    <AppText variant="display" color={color} center>
      {value}
    </AppText>
  );
}

/** the note being sung, coloured by accuracy, and the live score under it */
export function SingBackDisplay({ note, color, score }: { note: string | null; color: string; score: number | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.singBack}>
      <View style={styles.noteBox}>
        <AppText variant="score" weight="black" color={color} center>
          {note ?? '♪'}
        </AppText>
      </View>
      <AppText variant="caption" color={palette.white}>
        {score !== null ? t('session.round.accuracy', { score }) : ' '}
      </AppText>
    </View>
  );
}

/** the round's verdict: mascot, label, detail, and target vs what was sung */
export function RoundResult({ result }: { result: RoundScore | null }) {
  const { t } = useTranslation();
  if (!result) return null;
  const color = VERDICT_COLORS[result.verdict] ?? (result.ok ? palette.accent : palette.warning);
  return (
    <View style={styles.result}>
      <Image source={MASCOTS[result.verdict]} style={styles.mascot} resizeMode="contain" />
      <AppText variant="headline" weight="black" color={color} center>
        {result.label}
      </AppText>
      <AppText variant="caption" color={palette.textSecondary} center style={styles.detail}>
        {result.detail}
      </AppText>
      {result.expected && result.actual !== '—' && (
        <AppText variant="caption" center style={styles.comparison}>
          {t('session.round.targetVsResult', { expected: result.expected, actual: result.actual })}
        </AppText>
      )}
    </View>
  );
}

const OUTCOME_GLYPH: Partial<Record<NoteOutcome['status'], string>> = { hit: '●', close: '◐', extra: '+' };

/** per-note marks for chord and melody drills: hit, close, extra, missed */
export function OutcomeDots({ outcomes }: { outcomes: NoteOutcome[] }) {
  const color = (o: NoteOutcome) =>
    o.status === 'hit' ? palette.accent : o.status === 'close' ? palette.warning : o.status === 'extra' ? palette.danger : palette.textFaint;
  return (
    <View style={styles.dots}>
      {outcomes.length > 0 ? (
        outcomes.map((o, i) => (
          <AppText key={i} variant="caption" color={color(o)}>
            {OUTCOME_GLYPH[o.status] ?? '○'} {o.label}
          </AppText>
        ))
      ) : (
        <AppText variant="caption"> </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  singBack: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.xs },
  noteBox: { height: 60, overflow: 'visible', justifyContent: 'center' },
  result: { alignItems: 'center', gap: spacing.xs },
  mascot: { width: 140, height: 140, marginBottom: spacing.md },
  detail: { marginTop: spacing.xs },
  comparison: { marginTop: spacing.sm },
  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md, flexWrap: 'wrap' },
});
