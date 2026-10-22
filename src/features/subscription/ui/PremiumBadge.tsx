/** The small accent pill that marks a Premium surface. */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { AppText } from '@/shared/ui';

export function PremiumBadge({ label, locked = false }: { label?: string; locked?: boolean }) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: 'rgba(139, 124, 255, 0.16)',
        },
      ]}
    >
      <Ionicons name={locked ? 'lock-closed' : 'sparkles'} size={9} color={palette.accentSecondary} />
      <AppText variant="caption" color={palette.accentSecondary} style={styles.text}>
        {label ?? t('subscription.premium')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
