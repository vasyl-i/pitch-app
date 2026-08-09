/**
 * The standard locked surface.
 *
 * Deliberately not a blur or an empty box with a padlock. A lock that shows
 * nothing teaches the user that Premium is where the app hides things; a lock
 * that shows the *specific* thing waiting for them — their own weak spot,
 * their own comparison — teaches them what the coach already knows. So this
 * card leads with a real preview line and keeps the lock secondary.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { AppText, Card } from '@/shared/ui';
import { PremiumBadge } from './PremiumBadge';

interface LockedFeatureCardProps {
  title: string;
  /** what this unlocks, in the user's terms — never "upgrade to unlock" */
  description: string;
  /**
   * A concrete, personal line derived from real data where possible
   * ("You've sung 24¢ flat on F4 across 9 sessions"). Omit rather than
   * invent — a fake preview is worse than none.
   */
  preview?: string;
  bullets?: string[];
  cta?: string;
  onPress: () => void;
}

export function LockedFeatureCard({
  title,
  description,
  preview,
  bullets,
  cta = 'See Premium',
  onPress,
}: LockedFeatureCardProps) {
  const { palette, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} — Premium feature`}
      accessibilityHint="Opens the Premium plans"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <Card variant="highlighted" style={{ padding: spacing.lg }}>
        <View style={styles.headerRow}>
          <PremiumBadge locked />
          <Ionicons name="lock-closed" size={13} color={palette.textFaint} />
        </View>

        <AppText variant="label" style={{ fontSize: 17, marginTop: spacing.sm }}>
          {title}
        </AppText>
        <AppText variant="body" style={{ marginTop: 4 }}>
          {description}
        </AppText>

        {preview !== undefined && (
          <View
            style={[
              styles.preview,
              { borderLeftColor: palette.accent, marginTop: spacing.md, paddingLeft: spacing.md },
            ]}
          >
            <AppText variant="caption" color={palette.textSecondary} style={{ fontStyle: 'italic' }}>
              {preview}
            </AppText>
          </View>
        )}

        {bullets && bullets.length > 0 && (
          <View style={{ marginTop: spacing.md, gap: 6 }}>
            {bullets.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <Ionicons name="checkmark" size={13} color={palette.accent} />
                <AppText variant="caption" style={{ flex: 1 }}>
                  {b}
                </AppText>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.ctaRow, { marginTop: spacing.md }]}>
          <AppText variant="label" color={palette.accent} style={{ fontSize: 14 }}>
            {cta}
          </AppText>
          <Ionicons name="arrow-forward" size={14} color={palette.accent} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { borderLeftWidth: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
