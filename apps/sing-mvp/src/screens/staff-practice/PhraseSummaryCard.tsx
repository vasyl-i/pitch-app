import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { starsForScore } from '@/features/progress';
import { PremiumGate } from '@/features/subscription';
import { AppText, Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { AttemptComparison, PhraseSummary } from '@/features/staff-practice';

interface SummaryAction {
  title: string;
  onPress: () => void;
}

/** Post-phrase summary — glass card, Apple-HIG-ish stat grid + a big score.
 * The host screen supplies the buttons: guided practice continues the lesson,
 * free practice just goes again or leaves.
 *
 * The headline score is the *unaided* attempt — that is the one that measures
 * what was learned, and the one persisted to progress. When an assisted
 * attempt preceded it, the two are shown side by side underneath: see
 * `entities/exercise/comparison` for why the framing of a drop matters. */
export function PhraseSummaryCard({
  summary,
  comparison,
  primary,
  secondary,
}: {
  summary: PhraseSummary;
  comparison?: AttemptComparison | null;
  primary: SummaryAction;
  secondary: SummaryAction;
}) {
  const { palette, spacing } = useTheme();
  // single source of truth — the same helper decides the stars we persist
  const stars = starsForScore(summary.score);

  const stat = (label: string, value: string) => (
    <View style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="label" style={{ fontSize: 17 }}>
        {value}
      </AppText>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Phrase score
        </AppText>
        <AppText variant="display" color={palette.accent} style={styles.score}>
          {summary.score}
        </AppText>
        <AppText variant="title" style={{ textAlign: 'center', fontSize: 22, letterSpacing: 4 }}>
          {'★'.repeat(stars)}
          <AppText variant="title" color={palette.textFaint} style={{ fontSize: 22, letterSpacing: 4 }}>
            {'★'.repeat(3 - stars)}
          </AppText>
        </AppText>

        <View style={styles.grid}>
          {stat('Avg. deviation', `${Math.round(summary.avgCents)}¢`)}
          {stat('Pitch stability', `${summary.stability}%`)}
          {stat('Rhythm', `${summary.rhythm}%`)}
          {stat('Longest stable', `${summary.longestStableSec.toFixed(1)}s`)}
        </View>

        {/* The comparison is measured for everyone (the free 3-stage run
            produces both attempts); only the breakdown is Premium. The lock
            teaser carries the singer's *real* delta, so the value on offer is
            their own result, not a mock-up. */}
        {comparison && (
          <View style={[styles.compare, { borderTopColor: palette.borderSubtle }]}>
            <PremiumGate
              feature="attempt-comparison"
              source="attempt-comparison"
              fallback={(openPaywall) => (
                <LockedComparison comparison={comparison} onPress={openPaywall} />
              )}
            >
              <View style={styles.compareRow}>
                <View style={[styles.attempt, styles.attemptFirst]}>
                  <AppText variant="caption">Assisted</AppText>
                  <AppText variant="label" style={{ fontSize: 20, marginTop: 4 }}>
                    {comparison.accompaniedScore}%
                  </AppText>
                </View>
                <View style={[styles.attempt, { borderLeftColor: palette.borderSubtle }]}>
                  <AppText variant="caption">Solo</AppText>
                  <AppText variant="label" style={{ fontSize: 20, marginTop: 4 }}>
                    {comparison.soloScore}%
                  </AppText>
                </View>
                <View style={[styles.attempt, { borderLeftColor: palette.borderSubtle }]}>
                  <AppText variant="caption">Difference</AppText>
                  <AppText
                    variant="label"
                    color={comparison.trend === 'slipped' ? palette.textSecondary : palette.accent}
                    style={{ fontSize: 20, marginTop: 4 }}
                  >
                    {comparison.delta > 0 ? '+' : comparison.delta < 0 ? '−' : ''}
                    {Math.abs(comparison.delta)}%
                  </AppText>
                </View>
              </View>
              <AppText variant="body" style={styles.compareMessage}>
                {comparison.message}
              </AppText>
            </PremiumGate>
          </View>
        )}
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Button title={primary.title} onPress={primary.onPress} />
        <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
      </View>
    </View>
  );
}

/**
 * The locked comparison: it still reveals that a difference was measured and
 * whether it went the right way, but not the numbers — enough to make the
 * unlock feel like claiming something you earned, not buying a mystery.
 */
function LockedComparison({ comparison, onPress }: { comparison: AttemptComparison; onPress: () => void }) {
  const { palette, spacing } = useTheme();
  const wentWell = comparison.trend !== 'slipped';
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Opens the Premium plans" onPress={onPress}>
      {({ pressed }) => (
        <Card variant="highlighted" style={[{ padding: spacing.md, gap: 6 }, pressed && { opacity: 0.85 }]}>
          <View style={styles.lockRow}>
            <Ionicons name="git-compare" size={15} color={palette.accent} />
            <AppText variant="label" style={{ fontSize: 14, flex: 1 }}>
              Assisted vs. independent
            </AppText>
            <Ionicons name="lock-closed" size={13} color={palette.textFaint} />
          </View>
          <AppText variant="caption">
            {wentWell
              ? 'You held up well on your own this time — see the full accuracy, stability and rhythm breakdown with Premium.'
              : 'Premium shows exactly where the guide was carrying you — accuracy, stability and rhythm, side by side.'}
          </AppText>
          <AppText variant="caption" color={palette.accent} style={{ fontSize: 12 }}>
            Unlock comparison →
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { padding: 24 },
  score: { fontSize: 64, textAlign: 'center', lineHeight: 70 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  stat: { width: '50%', paddingVertical: 10, gap: 3 },
  compare: { marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  compareRow: { flexDirection: 'row' },
  attempt: { flex: 1, minWidth: 0, paddingLeft: 12, borderLeftWidth: 1 },
  attemptFirst: { paddingLeft: 0, borderLeftWidth: 0 },
  compareMessage: { marginTop: 14, fontSize: 14, lineHeight: 20 },
});
