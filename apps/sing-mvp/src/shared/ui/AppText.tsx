import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/shared/theme';

type Variant = 'display' | 'title' | 'body' | 'caption' | 'label';

interface AppTextProps extends TextProps {
  variant?: Variant;
  /** token-based color override, defaults per variant */
  color?: string;
}

/**
 * Typography atom. All text in the app goes through this component so the
 * font family/scale can be swapped centrally via theme tokens.
 */
export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const { palette, typography } = useTheme();

  const variants: Record<Variant, TextStyle> = {
    display: {
      fontSize: typography.size.display,
      fontFamily: typography.family.black,
      letterSpacing: -1.2,
      color: palette.textPrimary,
    },
    title: {
      fontSize: typography.size.xl,
      fontFamily: typography.family.bold,
      letterSpacing: -0.3,
      color: palette.textPrimary,
    },
    body: {
      fontSize: typography.size.md,
      fontFamily: typography.family.regular,
      color: palette.textSecondary,
      lineHeight: typography.size.md * 1.5,
    },
    label: {
      fontSize: typography.size.md,
      fontFamily: typography.family.medium,
      color: palette.textPrimary,
    },
    caption: {
      fontSize: typography.size.xs,
      fontFamily: typography.family.regular,
      color: palette.textFaint,
      lineHeight: typography.size.xs * 1.5,
    },
  };

  return <Text style={[variants[variant], color ? { color } : null, style]} {...rest} />;
}
