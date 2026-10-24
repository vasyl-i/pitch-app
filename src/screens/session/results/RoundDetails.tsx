import { Pressable, StyleSheet, View } from 'react-native';
import type { NoteOutcome, OutcomeStatus, RoundScore } from '@/features/ear-training';
import { PremiumGate } from '@/features/subscription';
import { AppText, Button, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { MelodyOverlay } from '../MelodyOverlay';

const STATUS_GLYPH: Record<OutcomeStatus, string> = { hit: '✓', close: '~', missing: '·', extra: '+', wrong: '✕' };
const STATUS_COLOR: Record<OutcomeStatus, string> = {
  hit: palette.accent,
  close: palette.warning,
  missing: palette.textFaint,
  extra: palette.danger,
  wrong: palette.danger,
};

/** an opened round: target vs sung, per-note detail, the pitch overlay (Premium), and replaying the answer */
export function RoundDetails({ round, onReplay }: { round: RoundScore; onReplay: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.details}>
      <View style={styles.lines}>
        <AppText variant="caption">{t('session.results.target', { value: round.expected })}</AppText>
        <AppText variant="caption">{t('session.results.you', { value: round.actual })}</AppText>
        {round.avgCents !== null && <AppText variant="caption">{t('session.results.deviation', { cents: round.avgCents })}</AppText>}
      </View>
      {round.notes && round.notes.length > 0 && <NoteRows notes={round.notes} />}
      {round.overlay && (
        <PremiumGate feature="performance-overlay" source="performance-overlay" fallback={(openPaywall) => <LockedOverlay onPress={openPaywall} />}>
          <MelodyOverlay target={round.overlay.target} sung={round.overlay.sung} />
        </PremiumGate>
      )}
      <Button title={t('session.results.hearAnswer')} variant="ghost" onPress={onReplay} />
    </View>
  );
}

function NoteRows({ notes }: { notes: NoteOutcome[] }) {
  const { t } = useTranslation();
  const detail = (n: NoteOutcome) =>
    n.status === 'missing'
      ? t('session.results.notHeard')
      : n.status === 'extra'
        ? t('session.results.extra')
        : n.cents === null
          ? ''
          : `${n.cents > 0 ? '+' : ''}${n.cents}¢`;
  return (
    <View style={styles.notes}>
      {notes.map((n, i) => (
        <View key={i} style={styles.noteRow}>
          <AppText variant="caption" color={STATUS_COLOR[n.status]}>
            {STATUS_GLYPH[n.status]} {n.label}
          </AppText>
          <AppText variant="caption">{detail(n)}</AppText>
        </View>
      ))}
    </View>
  );
}

/** the locked stand-in for the target-vs-sung pitch overlay */
function LockedOverlay({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('session.results.overlayA11y')} accessibilityHint={t('session.results.overlayHint')} onPress={onPress}>
      {({ pressed }) => (
        <Card variant="highlighted" style={[styles.locked, pressed && styles.pressed]}>
          <AppText variant="caption" color={palette.accent}>
            {t('session.results.overlayTitle')}
          </AppText>
          <AppText variant="caption" center>
            {t('session.results.overlayBody')}
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  details: { paddingBottom: spacing.md, gap: spacing.md },
  lines: { gap: 2 },
  notes: { gap: spacing.xs },
  noteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  locked: { padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.85 },
});
