import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/shared/i18n';
import { useIsOffline } from '@/shared/lib/network';
import { palette, radii, spacing } from '@/shared/theme';
import { AppText } from './AppText';

/** a small "Offline" pill; renders nothing while there is a connection */
export function OfflineBadge() {
  const { t } = useTranslation();
  if (!useIsOffline()) return null;
  return (
    <View style={styles.badge} accessibilityRole="text">
      <Ionicons name="cloud-offline" size={14} color={palette.warning} />
      <AppText variant="caption" weight="medium" color={palette.warning}>
        {t('common.offline')}
      </AppText>
    </View>
  );
}

/** a tab's title with the offline pill at the opposite end of the same row */
export function TabTitleRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.title}>{children}</View>
      <OfflineBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.warningTint,
  },
});
