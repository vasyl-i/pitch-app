import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
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
 */
export function Screen({ children, style, backdrop, overlay }: PropsWithChildren<{ style?: ViewStyle; backdrop?: ReactNode; overlay?: ReactNode }>) {
  const { palette, spacing } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {backdrop ?? <AppBackground />}
      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, { padding: spacing.lg }, style]}>{children}</View>
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
