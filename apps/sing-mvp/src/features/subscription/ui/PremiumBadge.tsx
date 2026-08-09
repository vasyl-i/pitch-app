/** The small accent pill that marks a Premium surface. */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui';

export function PremiumBadge({ label = 'Premium', locked = false }: { label?: string; locked?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: 'rgba(139, 124, 255, 0.16)',
          shadowColor: palette.accentSecondary,
        },
      ]}
    >
      <Ionicons name={locked ? 'lock-closed' : 'sparkles'} size={9} color={palette.accentSecondary} />
      <AppText variant="caption" color={palette.accentSecondary} style={styles.text}>
        {label}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    elevation: 4,
  },
  text: { fontSize: 11, fontWeight: '600' },
});
