import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AppText } from '@/shared/ui';
import { blur, palette, radii } from '@/shared/theme';

/** a "Continue with …" pill: solid white (Apple) or glass (Google, email) */
export function ProviderButton({ icon, label, light = false, disabled, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  light?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const ink = light ? palette.black : palette.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, light && styles.light, disabled ? styles.disabled : pressed && styles.pressed]}
    >
      {!light && (
        <>
          <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.surface} />
        </>
      )}
      <Ionicons name={icon} size={14} color={ink} />
      <AppText variant="label" color={ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  light: { backgroundColor: palette.white },
  surface: { ...StyleSheet.absoluteFill, backgroundColor: palette.surface },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.3 },
});
