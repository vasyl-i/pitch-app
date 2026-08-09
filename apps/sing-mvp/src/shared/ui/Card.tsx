import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/shared/theme';

type Variant = 'default' | 'highlighted';

/**
 * The glass card primitive — replaces the hand-rolled
 * `{ borderRadius: radii.lg, backgroundColor: palette.surface }` object that
 * used to be duplicated in nearly every screen. No border — separation
 * comes from the blur+surface fill and a soft shadow. `highlighted` is the
 * accent-tinted "selected" treatment (today's focus card, the chosen plan,
 * an active row).
 */
export function Card({
  children,
  variant = 'default',
  style,
  onLayout,
}: PropsWithChildren<{ variant?: Variant; style?: StyleProp<ViewStyle>; onLayout?: (e: LayoutChangeEvent) => void }>) {
  const { palette, radii, blur } = useTheme();
  const highlighted = variant === 'highlighted';

  return (
    <View style={[styles.root, { borderRadius: radii.lg }, style]} onLayout={onLayout}>
      <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: highlighted ? 'rgba(200, 218, 89, 0.12)' : palette.surface },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 3,
  },
});
