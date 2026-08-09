import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
}

/**
 * Pill button atom: lime primary on dark with a soft lime glow, translucent
 * glass ghost for secondary actions.
 */
export function Button({ title, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const { palette, radii, spacing, blur } = useTheme();

  const base: ViewStyle = {
    height: 58,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: variant === 'ghost' ? 'hidden' : 'visible',
  };

  const variants: Record<Variant, ViewStyle> = {
    primary: {
      backgroundColor: palette.buttonPrimaryBg,
      shadowColor: palette.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: disabled ? 0 : 0.4,
      shadowRadius: 18,
      elevation: disabled ? 0 : 8,
    },
    ghost: {},
  };

  const textColor = variant === 'primary' ? palette.buttonPrimaryText : palette.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [base, variants[variant], (pressed || disabled) && { opacity: disabled ? 0.3 : 0.8 }, style as ViewStyle]}
      {...rest}
    >
      {variant === 'ghost' && (
        <>
          <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
        </>
      )}
      <AppText variant="label" color={textColor}>
        {title}
      </AppText>
    </Pressable>
  );
}
