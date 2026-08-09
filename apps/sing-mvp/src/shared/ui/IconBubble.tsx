import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

/**
 * The small frosted-glass circle behind an icon — same glass language as the
 * bottom nav bar. One uniform treatment (white glyph, blurred dark circle)
 * for every leading icon in the app, no per-category color coding.
 */
export function IconBubble({ name, size = 40, iconSize = 18 }: { name: keyof typeof Ionicons.glyphMap; size?: number; iconSize?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
      <Ionicons name={name} size={iconSize} color="#FFFFFF" />
    </View>
  );
}
