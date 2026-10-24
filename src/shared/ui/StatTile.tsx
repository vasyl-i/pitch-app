import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, spacing } from '@/shared/theme';
import { AppText } from './AppText';

/**
 * One headline number in a grid of tiles: a small glyph, the value, and what
 * it counts. Tappable when the number has a history to open.
 *
 * The label reads as a lowercase caption under the number ("37% pitch
 * accuracy") — a deliberate exception to sentence case, applied here so the
 * shared strings stay capitalised where they are titles.
 */
export function StatTile({ icon, value, label, onPress, accessibilityHint }: {
  icon: ReactNode;
  value: string;
  label: string;
  onPress?: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {icon}
      <View style={styles.text}>
        <AppText variant="title" weight="medium" color={palette.white} gradient={false} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        <AppText variant="caption" color={palette.white} gradient={false} numberOfLines={2}>
          {lowerFirst(label)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 120,
    paddingTop: 21,
    paddingBottom: spacing.lg,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: palette.surfaceElevated,
    gap: 10,
  },
  pressed: { opacity: 0.8 },
  text: { gap: 10 },
});

/** the first letter in lower case; Unicode-aware, so Cyrillic works too */
function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}
