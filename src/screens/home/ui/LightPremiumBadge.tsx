import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../todayPalette';

/** Today screen's premium marker — a soft filled pill, no border. */
export function LightPremiumBadge({ label, locked = false }: { label?: string; locked?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.badge}>
      <Ionicons name={locked ? 'lock-closed' : 'sparkles'} size={9} color={todayColor.indigoDeep} />
      <AppText variant="caption" weight="medium" color={todayColor.indigoDeep}>
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
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: todayColor.indigoTint,
  },
});
