import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { todayColor } from '../todayPalette';

/** Today screen's premium marker — a soft filled pill, no border. */
export function LightPremiumBadge({ label = 'Premium', locked = false }: { label?: string; locked?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
        backgroundColor: todayColor.indigoTint,
      }}
    >
      <Ionicons name={locked ? 'lock-closed' : 'sparkles'} size={9} color={todayColor.indigoDeep} />
      <AppText color={todayColor.indigoDeep} style={{ fontSize: 11, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}
