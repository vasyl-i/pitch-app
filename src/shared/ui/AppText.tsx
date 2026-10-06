import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme';

type Variant = 'display' | 'title' | 'body' | 'caption' | 'label';

interface AppTextProps extends TextProps {
  variant?: Variant;
  /** token-based color override, defaults per variant */
  color?: string;
  /** gradient fade: true = force on, false = force off, undefined = auto (on for white text) */
  gradient?: boolean;
}

const WHITE_COLORS = ['#ffffff', '#fff', 'white'];

function isWhite(color: string | undefined): boolean {
  return !!color && WHITE_COLORS.includes(color.toLowerCase());
}

/**
 * Typography atom. All text in the app goes through this component so the
 * font family/scale can be swapped centrally via theme tokens.
 */
export function AppText({ variant = 'body', color, gradient, style, ...rest }: AppTextProps) {
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
      fontFamily: typography.family.regular,
      color: palette.textPrimary,
    },
    caption: {
      fontSize: typography.size.xs,
      fontFamily: typography.family.regular,
      color: palette.textFaint,
      lineHeight: typography.size.xs * 1.5,
    },
  };

  const resolvedColor = color ?? variants[variant].color as string;
  const applyGradient = gradient === true || (gradient !== false && isWhite(resolvedColor));

  const textElement = <Text style={[variants[variant], color ? { color } : null, style]} {...rest} />;

  if (applyGradient) {
    return (
      <MaskedView maskElement={textElement}>
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF', 'rgba(255, 255, 255, 0.7)']}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Invisible text to preserve layout size */}
          <Text style={[variants[variant], style, { opacity: 0 }]} {...rest} />
        </LinearGradient>
      </MaskedView>
    );
  }

  return textElement;
}
