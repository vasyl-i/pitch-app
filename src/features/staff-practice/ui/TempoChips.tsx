/**
 * The tempo and key-direction pickers for a piano-roll exercise, shared by the
 * practice library and the practice screen so both read and look the same.
 * They only report a pick; persisting it (and restarting a run) is the
 * caller's business.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { isPremiumSpeed, SPEED_LEVELS, speedBpm, type ScaleDirection, type SpeedLevel } from '../model/speedStore';

/** one chip per speed, labelled in bpm; Premium speeds show a lock for free users */
export function SpeedChips({
  bpm,
  value,
  premium,
  onChange,
  onLocked,
  compact = false,
  style,
}: {
  /** the exercise's authored tempo */
  bpm: number;
  value: SpeedLevel;
  premium: boolean;
  onChange: (rate: SpeedLevel) => void;
  /** a free user tapped a Premium speed */
  onLocked: () => void;
  /** bare numbers, under a caption naming the unit; screen readers still hear the bpm */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.chips, style]}>
      {SPEED_LEVELS.map((level) => {
        const isSelected = level === value;
        const locked = !premium && isPremiumSpeed(level);
        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={`${t('exercises.speedA11y', { bpm: speedBpm(bpm, level) })}${locked ? ', Premium' : ''}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => (locked ? onLocked() : onChange(level))}
            style={[styles.chip, locked && styles.iconChip, isSelected && styles.selected]}
          >
            {locked && <Ionicons name="lock-closed" size={10} color={palette.textFaint} />}
            <AppText variant="caption" color={isSelected ? palette.accent : locked ? palette.textFaint : palette.textSecondary}>
              {compact ? speedBpm(bpm, level) : t('exercises.bpm', { bpm: speedBpm(bpm, level) })}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** which end of the voice a scale starts its sweep through the keys from */
export function DirectionChips({
  value,
  onChange,
  compact = false,
  style,
}: {
  value: ScaleDirection;
  onChange: (direction: ScaleDirection) => void;
  /** arrows only; screen readers still hear the direction */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const options: readonly { id: ScaleDirection; label: string; icon: 'arrow-up' | 'arrow-down' }[] = [
    { id: 'up', label: t('exercises.lowToHigh'), icon: 'arrow-up' },
    { id: 'down', label: t('exercises.highToLow'), icon: 'arrow-down' },
  ];
  return (
    <View style={[styles.chips, style]}>
      {options.map(({ id, label, icon }) => {
        const isSelected = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={t('exercises.keysA11y', { direction: label.toLowerCase() })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(id)}
            style={[styles.chip, styles.iconChip, isSelected && styles.selected]}
          >
            <Ionicons name={icon} size={compact ? 14 : 11} color={isSelected ? palette.accent : palette.textSecondary} />
            {!compact && (
              <AppText variant="caption" color={isSelected ? palette.accent : palette.textSecondary}>
                {label}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: palette.surface },
  selected: { backgroundColor: palette.accentTint },
  iconChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
