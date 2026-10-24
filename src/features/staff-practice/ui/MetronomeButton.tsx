/**
 * Header toggle for the haptic metronome — the same blurred circle as the
 * back button it sits across from, lit in the accent while it is on.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

export function MetronomeButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const { palette, radii, blur } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={t('staff.metronome')}
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: radii.pill, borderColor: on ? palette.accent : palette.outline },
        pressed && { opacity: 0.7 },
      ]}
    >
      <BlurView intensity={blur.card} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} />
      {on && <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accentTint }]} />}
      <MaterialCommunityIcons name="metronome" size={22} color={on ? palette.accent : palette.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
