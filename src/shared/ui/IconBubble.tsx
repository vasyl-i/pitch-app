import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { palette, whiteAlpha } from '@/shared/theme';

/**
 * The small frosted-glass circle behind an icon — same glass language as the
 * bottom nav bar. One uniform treatment (white glyph, blurred dark circle)
 * for every leading icon in the app, no per-category color coding.
 */
export function IconBubble({ name, size = 40, iconSize = 18 }: { name: keyof typeof Ionicons.glyphMap; size?: number; iconSize?: number }) {
  const circle = useMemo(() => ({ width: size, height: size, borderRadius: size / 2 }), [size]);
  return (
    <View style={[styles.bubble, circle]}>
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <Ionicons name={name} size={iconSize} color={palette.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: whiteAlpha(0.08) },
});
