import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
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
export function LightLockedCard({
  title,
  description,
  preview,
  bullets,
  cta = 'See Premium',
  onPress,
}: {
  title: string;
  description: string;
  preview?: string;
  bullets?: string[];
  cta?: string;
  onPress: () => void;
}) {
  const { spacing } = useTheme();

  return (
    <SoftCard onPress={onPress} tint={todayColor.surfaceMuted} style={{ padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <LightPremiumBadge locked />
        <Ionicons name="lock-closed" size={12} color={todayColor.inkFaint} />
      </View>

      <AppText color={todayColor.ink} variant="label" style={{ fontSize: 16, marginTop: spacing.sm }}>
        {title}
      </AppText>
      <AppText color={todayColor.inkSecondary} style={{ marginTop: 4, fontSize: 13.5, lineHeight: 19 }}>
        {description}
      </AppText>

      {preview !== undefined && (
        <View style={{ marginTop: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: todayColor.indigo }}>
          <AppText color={todayColor.inkSecondary} style={{ fontStyle: 'italic', fontSize: 12.5 }}>
            {preview}
          </AppText>
        </View>
      )}

      {bullets && bullets.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          {bullets.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark" size={13} color={todayColor.indigoDeep} />
              <AppText color={todayColor.inkSecondary} style={{ flex: 1, fontSize: 12.5 }}>
                {b}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
        <AppText color={todayColor.indigoDeep} variant="label" style={{ fontSize: 13.5 }}>
          {cta}
        </AppText>
        <Ionicons name="arrow-forward" size={13} color={todayColor.indigoDeep} />
      </View>
    </SoftCard>
  );
}
