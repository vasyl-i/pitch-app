import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';
import { LightPremiumBadge } from './LightPremiumBadge';
import { SoftCard } from './SoftCard';

/**
 * Today screen's locked-feature surface — same content contract as the
 * shared `LockedFeatureCard` (lead with a real preview, keep the lock
 * secondary), restyled for this screen's own dark palette. Passed to
 * `PremiumGate` via its `fallback` prop so the shared component (used by
 * other screens) stays untouched.
 */
export function LightLockedCard({ title, description, preview, bullets, cta, onPress }: {
  title: string;
  description: string;
  preview?: string;
  bullets?: string[];
  cta?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <SoftCard onPress={onPress} tint={todayColor.surfaceMuted} style={styles.card}>
      <View style={styles.header}>
        <LightPremiumBadge locked />
        <Ionicons name="lock-closed" size={12} color={todayColor.inkFaint} />
      </View>

      <AppText variant="label" color={todayColor.ink} style={styles.title}>
        {title}
      </AppText>
      <AppText variant="small" color={todayColor.inkSecondary} style={styles.description}>
        {description}
      </AppText>

      {preview !== undefined && (
        <View style={styles.preview}>
          <AppText variant="caption" color={todayColor.inkSecondary} style={styles.italic}>
            {preview}
          </AppText>
        </View>
      )}

      {bullets && bullets.length > 0 && (
        <View style={styles.bullets}>
          {bullets.map((b) => (
            <View key={b} style={styles.bullet}>
              <Ionicons name="checkmark" size={13} color={todayColor.indigoDeep} />
              <AppText variant="caption" color={todayColor.inkSecondary} style={styles.bulletText}>
                {b}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cta}>
        <AppText variant="small" color={todayColor.indigoDeep}>
          {cta ?? t('subscription.seePremium')}
        </AppText>
        <Ionicons name="arrow-forward" size={13} color={todayColor.indigoDeep} />
      </View>
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: spacing.sm },
  description: { marginTop: spacing.xs },
  preview: { marginTop: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: todayColor.indigo },
  italic: { fontStyle: 'italic' },
  bullets: { marginTop: spacing.md, gap: 6 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { flex: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
});
