import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { todayColor } from '../todayPalette';

type Variant = 'dark' | 'soft';

interface PillButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
}

/**
 * Today screen's pill button — same silhouette as the app-wide `Button`
 * (large, fully rounded). The primary action is a solid white fill, the
 * page's one confident colour; secondary actions get a quiet translucent
 * pill, no border.
 */
export function PillButton({ title, variant = 'dark', disabled, style, ...rest }: PillButtonProps) {
  const label = (
    <AppText variant="label" color={variant === 'dark' ? todayColor.inkOnAccent : todayColor.ink} gradient={false}>
      {title}
    </AppText>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        variant === 'soft' && [styles.pill, styles.soft],
        disabled ? styles.disabled : pressed && styles.pressed,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {variant === 'dark' ? <View style={[styles.pill, styles.solid]}>{label}</View> : label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 56,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: palette.white },
  soft: { backgroundColor: todayColor.surfaceMuted },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.35 },
});
