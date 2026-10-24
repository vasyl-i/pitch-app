import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { blur, palette, radii, textVariants, useTheme } from '@/shared/theme';

/** a text input on a glass pill — the app's one field style (sign-in, passwords) */
export const TextField = forwardRef<TextInput, TextInputProps>(function TextField({ style, ...props }, ref) {
  // from the theme hook: a TextInput doesn't follow a live language switch on its own
  const { typography } = useTheme();
  return (
    <View style={styles.pill}>
      <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.surface} />
      <TextInput
        ref={ref}
        placeholderTextColor={palette.textSecondary}
        style={[styles.input, { fontFamily: typography.family.regular }, style]}
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  pill: { height: 58, justifyContent: 'center', borderRadius: radii.pill, overflow: 'hidden' },
  surface: { ...StyleSheet.absoluteFill, backgroundColor: palette.surface },
  input: { height: 58, paddingHorizontal: 20, fontSize: textVariants.label.fontSize, color: palette.textPrimary },
});
