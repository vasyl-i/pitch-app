import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/shared/theme';

/**
 * The design's circular back button (44px, glass) for screens inside stacks
 * where the native header is hidden.
 */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { palette, radii, blur } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderRadius: radii.pill }, pressed && { opacity: 0.7 }]}
    >
      <BlurView intensity={blur.card} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface, borderRadius: radii.pill }]} />
      <Ionicons name="arrow-back" size={18} color={palette.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
