import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing, whiteAlpha } from '@/shared/theme';

/** a titled list of exercises, each switched in or out of daily practice */
export function ExerciseToggleList({ title, items, isEnabled, onToggle }: {
  title: string;
  items: readonly { id: string; title: string }[];
  isEnabled: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="small">{title}</AppText>
      <View style={styles.list}>
        {items.map((a) => (
          <ToggleRow key={a.id} title={a.title} enabled={isEnabled(a.id)} onToggle={() => onToggle(a.id)} />
        ))}
      </View>
    </View>
  );
}

function ToggleRow({ title, enabled, onToggle }: { title: string; enabled: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <AppText variant="small" color={enabled ? palette.textPrimary : palette.textFaint} style={styles.title}>
        {title}
      </AppText>
      <Ionicons name={enabled ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={enabled ? palette.accent : palette.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  list: { marginTop: spacing.sm, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  pressed: { backgroundColor: whiteAlpha(0.04) },
  title: { flex: 1 },
});
