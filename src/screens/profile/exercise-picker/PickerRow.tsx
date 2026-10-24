import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { ExerciseIcon } from '../../exercises/ui/ExerciseIcon';

export const PICKER_ICON_SIZE = 48;

/** an exercise to add: icon, name, length (and source), and how many times it's already on the day */
export function PickerRow({ id, color, title, minutes, source, added, disabled, onPress }: {
  id: string;
  color: string;
  title: string;
  minutes: number;
  source?: string;
  added: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const meta = [
    t('common.minutesShort', { count: minutes }),
    source,
    added > 0 ? t('profile.picker.added', { count: added }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.row, disabled ? styles.disabled : pressed && styles.pressed]}>
          <ExerciseIcon id={id} size={PICKER_ICON_SIZE} radius={12} color={color} />
          <View style={styles.text}>
            <AppText variant="small" color={palette.textPrimary}>
              {title}
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {meta}
            </AppText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: spacing.md },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  text: { flex: 1 },
  meta: { marginTop: 1 },
});
