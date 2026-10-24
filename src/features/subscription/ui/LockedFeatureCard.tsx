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
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
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

export function LockedFeatureCard({ title, description, preview, bullets, cta, onPress }: LockedFeatureCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('subscription.featureA11y', { title })}
      accessibilityHint={t('session.results.overlayHint')}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card variant="highlighted" style={styles.card}>
        <View style={styles.headerRow}>
          <PremiumBadge locked />
          <Ionicons name="lock-closed" size={13} color={palette.textFaint} />
        </View>

        <AppText variant="subtitle" weight="regular" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" style={styles.description}>
          {description}
        </AppText>

        {preview !== undefined && (
          <View style={styles.preview}>
            <AppText variant="caption" color={palette.textSecondary} style={styles.italic}>
              {preview}
            </AppText>
          </View>
        )}

        {bullets && bullets.length > 0 && (
          <View style={styles.bullets}>
            {bullets.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <Ionicons name="checkmark" size={13} color={palette.accent} />
                <AppText variant="caption" style={styles.bulletText}>
                  {b}
                </AppText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.ctaRow}>
          <AppText variant="small" color={palette.accent}>
            {cta ?? t('subscription.seePremium')}
          </AppText>
          <Ionicons name="arrow-forward" size={14} color={palette.accent} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  card: { padding: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: spacing.sm },
  description: { marginTop: spacing.xs },
  preview: { borderLeftWidth: 2, borderLeftColor: palette.accent, marginTop: spacing.md, paddingLeft: spacing.md },
  italic: { fontStyle: 'italic' },
  bullets: { marginTop: spacing.md, gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { flex: 1 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
});
