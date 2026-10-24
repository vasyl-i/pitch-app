import { Image, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { blur, palette, radii } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/**
 * The design's circular back button (48px, glass) for screens inside stacks
 * where the native header is hidden.
 */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <BlurView intensity={blur.card} tint="dark" style={styles.glass} />
      <Image source={require('../../../assets/back.png')} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.outline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  glass: { ...StyleSheet.absoluteFill, borderRadius: radii.pill },
});
