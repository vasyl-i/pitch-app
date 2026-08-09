import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, IconBubble } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { SoftCard } from './SoftCard';

/** A tappable, icon-led row — the "Set your goal" / "Weak spots" pattern. */
export function SoftRow({
  icon,
  title,
  subtitle,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <SoftCard onPress={onPress} style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconBubble name={icon} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText color={todayColor.ink} style={{ fontSize: 15.5 }} variant="label">
            {title}
          </AppText>
          {badge}
        </View>
        <AppText color={todayColor.inkSecondary} style={{ marginTop: 3, fontSize: 12.5 }} variant="caption">
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={todayColor.inkFaint} />
    </SoftCard>
  );
}
