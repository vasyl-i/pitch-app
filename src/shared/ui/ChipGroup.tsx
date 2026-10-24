import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { blur, gradient, palette, radii, spacing } from '@/shared/theme';
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
  return (
    <View style={styles.group}>
      <AppText variant="small">{title}</AppText>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={String(o.value)} label={o.label} active={selected.includes(o.value)} onPress={() => onSelect(o.value)} />
        ))}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {active ? (
        <LinearGradient colors={gradient.accent} start={GRADIENT_START} end={GRADIENT_END} style={styles.fill} />
      ) : (
        <>
          <BlurView intensity={blur.card} tint="dark" style={styles.fill} />
          <View style={[styles.fill, styles.surface]} />
        </>
      )}
      <AppText variant="small" color={active ? palette.onAccent : palette.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radii.pill, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
  fill: { ...StyleSheet.absoluteFill, borderRadius: radii.pill },
  surface: { backgroundColor: palette.surface },
});
