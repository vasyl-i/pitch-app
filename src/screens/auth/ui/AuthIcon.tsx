import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing } from '@/shared/theme';

/** the big accent glyph in a soft circle at the top of an auth message */
export function AuthIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.circle}>
      <Ionicons name={name} size={48} color={palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: palette.surface,
  },
});
