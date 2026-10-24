import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { WEEKDAY_LABELS, type WeekdayIndex, type WeeklyExerciseEntry, type WeeklyPlan } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { blackAlpha, palette, radii, spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** pick a weekday to add an exercise to, showing what each day already holds */
export function DayPickerModal({ entry, weeklyPlan, onSelect, onClose }: {
  entry: WeeklyExerciseEntry | null;
  weeklyPlan: WeeklyPlan;
  onSelect: (day: WeekdayIndex) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={entry !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <AppText variant="subtitle" weight="regular" style={styles.title}>
            {t('exercises.addToDay')}
          </AppText>
          {WEEKDAY_LABELS.map((label, i) => {
            const day = i as WeekdayIndex;
            const dayEntries = weeklyPlan[day] ?? [];
            return (
              <DayOption
                key={day}
                label={label}
                total={dayEntries.length}
                duplicates={entry ? dayEntries.filter((e) => e.activityId === entry.activityId).length : 0}
                onPress={() => onSelect(day)}
              />
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DayOption({ label, total, duplicates, onPress }: { label: string; total: number; duplicates: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      <View>
        <AppText variant="label">{label}</AppText>
        {duplicates > 0 && (
          <AppText variant="caption" color={palette.accent} style={styles.duplicates}>
            {t('exercises.alreadySet', { count: duplicates, day: label })}
          </AppText>
        )}
      </View>
      <AppText variant="caption">
        {total > 0 ? t('profile.weekly.exerciseCount', { count: total }) : t('exercises.empty')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: blackAlpha(0.6), justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '80%', paddingVertical: 20, paddingHorizontal: spacing.xl, borderRadius: radii.lg, backgroundColor: palette.surfaceSolid },
  title: { marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: whiteAlpha(0.06),
  },
  pressed: { opacity: 0.6 },
  duplicates: { marginTop: 2 },
});
