import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ExerciseDefinition } from '@/features/ear-training';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { PICKER_ICON_SIZE, PickerRow } from './PickerRow';

/** an ear drill; one with several levels asks which to add, as chips under the row */
export function EarPickerRow({ drill, color, minutes, added, disabled, onSelect }: {
  drill: ExerciseDefinition;
  color: string;
  minutes: number;
  added: number;
  disabled: boolean;
  onSelect: (difficultyId?: string) => void;
}) {
  const [choosingLevel, setChoosingLevel] = useState(false);
  const levels = drill.difficulties;

  const onPress = () => {
    if (disabled) return;
    if (levels && levels.length > 1) setChoosingLevel(true);
    else onSelect(drill.defaultDifficulty);
  };

  return (
    <View>
      <PickerRow id={drill.id} color={color} title={drill.title} minutes={minutes} added={added} disabled={disabled} onPress={onPress} />
      {choosingLevel && levels && (
        <View style={styles.levels}>
          {levels.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => onSelect(d.id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.level, pressed && styles.pressed]}
            >
              <AppText variant="small" color={palette.accent}>
                {d.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: PICKER_ICON_SIZE + spacing.md, paddingBottom: spacing.sm },
  level: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: palette.accentTint },
  pressed: { opacity: 0.7 },
});
