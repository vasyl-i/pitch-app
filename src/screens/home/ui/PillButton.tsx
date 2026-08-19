import { Pressable, View, type PressableProps, type ViewStyle } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';

type Variant = 'dark' | 'soft';

interface PillButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
}

/**
 * Today screen's pill button — same silhouette as the app-wide `Button`
 * (large, fully rounded). The primary action is a solid lime fill with a
 * matching glow, the page's one confident accent color; secondary actions
 * get a quiet translucent pill, no border.
 */
export function PillButton({ title, variant = 'dark', disabled, style, ...rest }: PillButtonProps) {
  const { radii, spacing } = useTheme();

  const base: ViewStyle = {
    height: 56,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textColor = variant === 'dark' ? todayColor.inkOnAccent : todayColor.ink;

  const content = (
    <AppText variant="label" color={textColor}>
      {title}
    </AppText>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        variant === 'soft' && [base, { backgroundColor: todayColor.surfaceMuted }],
        (pressed || disabled) && { opacity: disabled ? 0.35 : 0.82 },
        style as ViewStyle,
      ]}
      {...rest}
    >
      {variant === 'dark' ? (
        <View
          style={[
            base,
            {
              backgroundColor: todayColor.orange,
              shadowColor: todayColor.orange,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: disabled ? 0 : 0.4,
              shadowRadius: 20,
              elevation: disabled ? 0 : 4,
            },
          ]}
        >
          {content}
        </View>
      ) : (
        content
      )}
    </Pressable>
  );
}
