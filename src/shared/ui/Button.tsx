import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette, radii, spacing } from '@/shared/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'accent' | 'ghost' | 'transparent';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
}

/**
 * Pill button atom: solid white primary, an accent-filled variant for the
 * sign-in flow, translucent glass ghost for secondary actions, bare text for
 * tertiary ones.
 */
export function Button({ title, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const textColor = variant === 'primary' || variant === 'accent' ? palette.buttonPrimaryText : palette.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled ? styles.disabled : pressed && styles.pressed,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {variant === 'ghost' && (
        <>
          <BlurView style={styles.ghostBlur} />
          <View style={styles.ghostSurface} />
        </>
      )}
      <AppText variant="label" color={textColor} gradient={false}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: palette.white },
  accent: { backgroundColor: palette.buttonPrimaryBg },
  ghost: { overflow: 'hidden' },
  transparent: {},
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.3 },
  ghostBlur: { ...StyleSheet.absoluteFill, backgroundColor: palette.ghost },
  ghostSurface: { ...StyleSheet.absoluteFill, backgroundColor: palette.surface },
});
