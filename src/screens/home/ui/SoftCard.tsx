import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';

/**
 * Today screen's card primitive: no border, no stroke — a translucent
 * surface a shade lighter than the near-black backdrop, lifted off the page
 * with a soft, wide shadow. Separation between cards comes from that tonal
 * contrast and spacing, never a stroke.
 */
export function SoftCard({
  children,
  style,
  onPress,
  tint,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string }>) {
  const { radii } = useTheme();
  const content = (
    <View
      style={[
        styles.root,
        { borderRadius: radii.lg, backgroundColor: tint ?? todayColor.surface },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    shadowColor: todayColor.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 3,
  },
});
