import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radii, spacing, textVariants, useTheme } from '@/shared/theme';

/** a search box: magnifier, the query, and a clear button once there is one */
export function SearchField({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  // from the theme hook: a TextInput doesn't follow a live language switch on its own
  const { typography } = useTheme();
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={palette.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textFaint}
        style={[styles.input, { fontFamily: typography.family.regular }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={palette.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: textVariants.label.fontSize, color: palette.textPrimary },
});
