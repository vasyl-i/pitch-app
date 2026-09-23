/**
 * Custom toast renderer for react-native-toast-message.
 * Matches the app's dark-glass design system: translucent surface,
 * blurred backdrop, Satoshi font, no borders.
 */
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BaseToastProps } from 'react-native-toast-message';
import { AppText } from './AppText';
import { palette, typography, radii, spacing, blur } from '@/shared/theme';

function ToastBase({ text1, text2, type }: BaseToastProps & { type: 'success' | 'info' | 'error' }) {
  const insets = useSafeAreaInsets();
  const iconMap = { success: 'checkmark-circle', info: 'information-circle', error: 'alert-circle' } as const;
  const colorMap = { success: palette.accent, info: palette.accentSecondary, error: palette.danger };

  return (
    <View style={[styles.wrapper, { marginTop: insets.top }]}>
      <View style={styles.container}>
        <BlurView intensity={blur.sheet} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
        <Ionicons name={iconMap[type]} size={22} color={colorMap[type]} />
        <View style={styles.textContainer}>
          {text1 ? (
            <AppText style={{ fontFamily: typography.family.medium, fontSize: 14, lineHeight: 18 }} color={palette.textPrimary}>
              {text1}
            </AppText>
          ) : null}
          {text2 ? (
            <AppText style={{ fontFamily: typography.family.regular, fontSize: 13, lineHeight: 17, marginTop: 2 }} color={palette.textSecondary}>
              {text2}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <ToastBase {...props} type="success" />,
  info: (props: BaseToastProps) => <ToastBase {...props} type="info" />,
  error: (props: BaseToastProps) => <ToastBase {...props} type="error" />,
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
  },
});
