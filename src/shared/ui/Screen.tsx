import type { PropsWithChildren, ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme';
import { AppBackground } from './AppBackground';

/**
 * Screen scaffold atom: dark background + the app's atmospheric corner-glow
 * backdrop + safe area + standard padding, so every screen gets the same
 * premium background without repeating the effect.
 *
 * `backdrop` lets a specific screen swap in its own background without
 * touching this default for every other screen — omit it and behavior is
 * unchanged.
 *
 * `dismissKeyboard` wraps content in a pressable that dismisses the keyboard
 * on tap — useful for screens with text inputs.
 */
export function Screen({ children, style, backdrop, overlay, dismissKeyboard, avoidKeyboard, noHorizontalPadding, noBottomPadding }: PropsWithChildren<{ style?: ViewStyle; backdrop?: ReactNode; overlay?: ReactNode; dismissKeyboard?: boolean; avoidKeyboard?: boolean; noHorizontalPadding?: boolean; noBottomPadding?: boolean }>) {
  const { palette, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const content = <View style={[styles.content, { paddingTop: spacing.lg, paddingBottom: noBottomPadding ? 0 : insets.bottom }, !noHorizontalPadding && { paddingHorizontal: spacing.lg }, style]}>{children}</View>;

  const inner = dismissKeyboard ? (
    <Pressable style={styles.safe} onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </Pressable>
  ) : content;

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {backdrop ?? <AppBackground />}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            style={styles.safe}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {inner}
          </KeyboardAvoidingView>
        ) : inner}
      </SafeAreaView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1 },
});
