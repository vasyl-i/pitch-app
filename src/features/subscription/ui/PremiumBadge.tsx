/** The small accent pill that marks a Premium surface. */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { AppText } from '@/shared/ui';

export function PremiumBadge({ label, locked = false }: { label?: string; locked?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.badge}>
      <Ionicons name={locked ? 'lock-closed' : 'sparkles'} size={9} color={palette.accentSecondary} />
      <AppText variant="caption" weight="medium" color={palette.accentSecondary}>
        {label ?? t('subscription.premium')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    backgroundColor: palette.premiumTint,
  },
});
