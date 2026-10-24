import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '@/shared/ui';
import { palette } from '@/shared/theme';

/** one of the three headline numbers under its icon; tappable when it leads somewhere */
export function StatTile({ label, value, icon, onPress }: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress} style={styles.slot}>
      {({ pressed }) => (
        <Card style={[styles.tile, pressed && onPress && styles.pressed]}>
          <Ionicons name={icon} size={22} color={palette.accent} />
          <AppText variant="title" style={styles.value}>
            {value}
          </AppText>
          <AppText variant="caption" style={styles.label}>
            {label}
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tile: { padding: 18, alignItems: 'flex-start' },
  pressed: { opacity: 0.85 },
  value: { marginTop: 10 },
  label: { marginTop: 2 },
});
