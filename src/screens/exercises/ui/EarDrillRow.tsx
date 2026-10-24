import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ExerciseDefinition } from '@/features/ear-training';
import { AppText } from '@/shared/ui';
import { palette, radii } from '@/shared/theme';
import { ExerciseRowFrame } from './ExerciseRowFrame';

/** an ear-training drill, with its difficulty levels as chips under it */
export const EarDrillRow = memo(function EarDrillRow({ drill, color, locked, onStart, onAdd, onLocked }: {
  drill: ExerciseDefinition;
  color: string;
  locked: boolean;
  onStart: (drillId: string, difficultyId: string | undefined) => void;
  onAdd: (drillId: string, difficultyId: string | undefined) => void;
  onLocked: () => void;
}) {
  const [level, setLevel] = useState<string | undefined>(drill.defaultDifficulty ?? undefined);

  return (
    <ExerciseRowFrame
      id={drill.id}
      color={color}
      title={drill.title}
      description={drill.tagline}
      locked={locked}
      onPress={locked ? onLocked : () => onStart(drill.id, level)}
      onAdd={() => onAdd(drill.id, level)}
    >
      {drill.difficulties && (
        <View style={styles.chips}>
          {drill.difficulties.map((d) => {
            const selected = d.id === level;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setLevel(d.id)}
                style={[styles.chip, selected && styles.selectedChip]}
              >
                <AppText variant="caption" color={selected ? palette.accent : palette.textSecondary}>
                  {d.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </ExerciseRowFrame>
  );
});

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: palette.surface },
  selectedChip: { backgroundColor: palette.accentTint },
});
