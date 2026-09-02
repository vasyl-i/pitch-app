import type { PropsWithChildren, ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
export function Screen({ children, style, backdrop, overlay, dismissKeyboard, avoidKeyboard }: PropsWithChildren<{ style?: ViewStyle; backdrop?: ReactNode; overlay?: ReactNode; dismissKeyboard?: boolean; avoidKeyboard?: boolean }>) {
  const { palette, spacing } = useTheme();

  const content = <View style={[styles.content, { padding: spacing.lg }, style]}>{children}</View>;

  const inner = dismissKeyboard ? (
    <Pressable style={styles.safe} onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </Pressable>
  ) : content;

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {backdrop ?? <AppBackground />}
      <SafeAreaView style={styles.safe}>
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
