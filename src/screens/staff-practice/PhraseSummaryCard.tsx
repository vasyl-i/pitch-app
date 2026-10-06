import { Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { starsForScore } from '@/features/progress';
import { PremiumGate } from '@/features/subscription';
import { AppText, Button, Card, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import type { AttemptComparison, PhraseSummary } from '@/features/staff-practice';
import { midiToName } from '@/shared/lib/music';
import { voiceType } from '@/entities/profile';

const isSmallScreen = Dimensions.get('screen').height < 700;

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
  tertiary,
}: {
  summary: PhraseSummary;
  comparison?: AttemptComparison | null;
  primary: SummaryAction;
  secondary: SummaryAction;
  tertiary?: SummaryAction;
}) {
  const { palette, spacing } = useTheme();
  // single source of truth — the same helper decides the stars we persist
  const stars = starsForScore(summary.score);

  const isSuccess = summary.score > 70;

  return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 80 }}>
          <View style={styles.scoreFrame}>
            <AppText color={palette.textSecondaryElevated} style={{ fontSize: 14, lineHeight: 16, marginBottom: 12 }}>
              Phrase score
            </AppText>
            <Image
                source={require('../../../assets/Score.png')}
                style={isSmallScreen ? styles.scoreMascotSmall : styles.scoreMascot}
                resizeMode="contain"
            />
            {isSuccess &&
                <Image
                    source={require('../../../assets/results-board-overlay.png')}
                    style={styles.scoreColorOverlay}
                    resizeMode="contain"
                    tintColor={'rgb(200 218 89 / 0.05)'}
                />
            }
            <View style={styles.scoreOverlay}>
              <AppText color={"#EEFF88"} style={{ fontSize: 48, lineHeight: 50, fontFamily: typography.family.bold }}>
                {`${summary.score}%`}
              </AppText>
              <AppText color={palette.textSecondaryElevated} style={{ fontSize: 12, lineHeight: 14 }}>
                {`${Math.round(summary.avgCents)}¢ average off  ·  ${summary.rhythm}% rhythm`}
              </AppText>
            </View>
          </View>
        </View>

        <View style={{ paddingBottom: spacing.xl, gap: 20 }}>
          <Button title={primary.title} onPress={primary.onPress} />
          <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
          {tertiary && (
            <Button title={tertiary.title} variant="transparent" onPress={tertiary.onPress} />
          )}
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
  card: { padding: 18, alignItems: 'center' },
  scoreFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scoreMascot: {
    width: 320,
    height: 328,
    marginHorizontal: 55,
  },
  scoreMascotSmall: {
    width: 220,
    height: 226,
    marginHorizontal: 55,
  },
  scoreColorOverlay: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    marginLeft: -6,
    opacity: 1,
  },
  scoreOverlay: {
    position: 'absolute',
    gap: 4,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontFamily: typography.family.medium,
  },
});

