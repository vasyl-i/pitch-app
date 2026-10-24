import { Image, StyleSheet, View } from 'react-native';
import { DEFAULT_CAT_ICON, EXERCISE_CAT_ICONS } from '../../home/ui/exerciseIcons';

/**
 * An exercise's cat illustration on a coloured square, anchored to the bottom
 * edge. Rasterised: rounded corners clipping an image need an off-screen
 * pass, which a list of these would otherwise repeat on every scroll frame.
 */
export function ExerciseIcon({ id, size, radius, color }: { id: string; size: number; radius: number; color: string }) {
  const icon = EXERCISE_CAT_ICONS[id] ?? DEFAULT_CAT_ICON;
  const imageSize = size - (icon.inset ?? 0) * 2;
  return (
    <View shouldRasterizeIOS renderToHardwareTextureAndroid style={[styles.square, { width: size, height: size, borderRadius: radius, backgroundColor: color }]}>
      <Image source={icon.source} style={{ width: imageSize, height: imageSize }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  square: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
});
