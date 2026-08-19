import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';

export interface ChipOption<T> {
  value: T;
  label: string;
}

/**
 * Titled group of selectable pill chips. Single- or multi-select is the
 * caller's concern: pass the current selection and handle taps.
 */
export function ChipGroup<T extends string | number | null>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: ChipOption<T>[];
  selected: readonly T[];
  onSelect: (value: T) => void;
}) {
  const { palette, spacing, radii, gradient, blur } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl }}>
      <AppText variant="caption" style={{ fontSize: 13, color: palette.textSecondary }}>
        {title}
      </AppText>
      <View style={[styles.chips, { marginTop: spacing.sm }]}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              onPress={() => onSelect(o.value)}
              style={({ pressed }) => [styles.chip, { borderRadius: radii.pill }, pressed && { opacity: 0.8 }]}
            >
              {active ? (
                <LinearGradient
                  colors={gradient.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]}
                />
              ) : (
                <>
                  <BlurView intensity={blur.card} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface, borderRadius: radii.pill }]} />
                </>
              )}
              <AppText variant="caption" color={active ? palette.onAccent : palette.textSecondary} style={{ fontSize: 13 }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
});
