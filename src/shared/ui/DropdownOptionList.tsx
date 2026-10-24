import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radii, spacing } from '@/shared/theme';
import { AppText } from './AppText';

export type Option = { value: number; label: string };
export type Anchor = { x: number; y: number; width: number; height: number };

export const ROW_HEIGHT = 44;
const MAX_VISIBLE_ROWS = 5;
const LIST_GAP = 6;

/** the open dropdown: a list anchored under its field (or above, when there isn't room), scrolled to the selection */
export function OptionList({ anchor, options, selected, selectedIndex, onSelect }: {
  anchor: Anchor;
  options: Option[];
  selected: number;
  selectedIndex: number;
  onSelect: (value: number) => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const listHeight = Math.min(options.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;
  // below the field, or above it when there isn't room
  const fitsBelow = anchor.y + anchor.height + LIST_GAP + listHeight <= windowHeight - spacing.xl;
  const top = fitsBelow ? anchor.y + anchor.height + LIST_GAP : anchor.y - LIST_GAP - listHeight;
  // the selection starts mid-list
  const initialOffset = Math.max(0, (selectedIndex - Math.floor(MAX_VISIBLE_ROWS / 2)) * ROW_HEIGHT);

  return (
    <View style={[styles.list, { top, left: anchor.x, width: anchor.width, height: listHeight }]}>
      <ScrollView contentOffset={{ x: 0, y: initialOffset }} showsVerticalScrollIndicator={false}>
        {options.map((o) => (
          <OptionRow key={o.value} option={o} selected={o.value === selected} onPress={() => onSelect(o.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function OptionRow({ option, selected, onPress }: { option: Option; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <AppText
        variant="label"
        weight={selected ? 'bold' : 'regular'}
        color={selected ? palette.accent : palette.textPrimary}
        gradient={false}
      >
        {option.label}
      </AppText>
      {selected && <Ionicons name="checkmark" size={18} color={palette.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: palette.surfaceSolid,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  option: {
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionPressed: { backgroundColor: palette.surface },
});
