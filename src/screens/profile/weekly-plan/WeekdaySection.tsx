import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dayTotalMinutes, resolveEntries, type WeeklyExerciseEntry } from '@/features/learning';
import { difficultyLabel } from '@/features/ear-training';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** one weekday: its summary row, and when open its exercises with remove buttons and "Add exercise" */
export function WeekdaySection({ label, entries, expanded, onToggle, onRemove, onAdd }: {
  label: string;
  entries: WeeklyExerciseEntry[];
  expanded: boolean;
  onToggle: () => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const resolved = resolveEntries(entries);
  const summary =
    resolved.length > 0
      ? `${t('profile.weekly.exerciseCount', { count: resolved.length })} · ${t('common.minutesShort', { count: dayTotalMinutes(entries) })}`
      : t('profile.weekly.noExercises');

  return (
    <View style={styles.section}>
      <Pressable onPress={onToggle} accessibilityRole="button">
        {({ pressed }) => (
          <View style={[styles.dayRow, pressed && styles.pressed]}>
            <View style={styles.fill}>
              <AppText variant="label">{label}</AppText>
              <AppText variant="caption" style={styles.summary}>
                {summary}
              </AppText>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textFaint} />
          </View>
        )}
      </Pressable>

      {expanded && (
        <View style={styles.expanded}>
          {resolved.length > 0 ? (
            resolved.map(({ entry, activity }, idx) => (
              <View key={`${entry.activityId}-${idx}`} style={styles.entry}>
                <View style={styles.fill}>
                  <AppText variant="small" color={palette.textPrimary}>
                    {activity.title}
                  </AppText>
                  <AppText variant="caption" style={styles.entryMeta}>
                    {t('common.minutesShort', { count: activity.minutes })}
                    {entry.difficultyId ? ` · ${difficultyLabel(entry.activityId, entry.difficultyId)}` : ''}
                  </AppText>
                </View>
                <Pressable onPress={() => onRemove(idx)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('profile.weekly.remove')}>
                  <Ionicons name="close-circle" size={22} color={palette.textFaint} />
                </Pressable>
              </View>
            ))
          ) : (
            <AppText variant="caption" style={styles.empty}>
              {t('profile.weekly.noExercisesDay')}
            </AppText>
          )}

          <Pressable onPress={onAdd} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <Ionicons name="add" size={16} color={palette.accent} />
            <AppText variant="small" color={palette.accent}>
              {t('profile.weekly.add')}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderBottomWidth: 1, borderBottomColor: whiteAlpha(0.06) },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pressed: { opacity: 0.7 },
  fill: { flex: 1 },
  summary: { marginTop: 2 },
  expanded: { paddingBottom: spacing.md },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingLeft: spacing.sm },
  entryMeta: { marginTop: 1 },
  empty: { paddingVertical: spacing.sm },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.accentTint,
  },
});
