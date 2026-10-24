import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { ExerciseIcon } from './ExerciseIcon';

const ICON_SIZE = 64;

/**
 * One library row: the exercise's illustrated icon, its name and a line under
 * it, an action on the right (add to plan, or a lock), and any controls
 * (level, tempo) below. Locked rows are dimmed and open the paywall.
 */
export function ExerciseRowFrame({ id, color, title, description, infoFooter, locked, onPress, onAdd, children }: {
  id: string;
  color: string;
  title: string;
  description: ReactNode;
  /** under the description, e.g. the best score */
  infoFooter?: ReactNode;
  locked?: boolean;
  onPress: () => void;
  onAdd?: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.card, pressed && styles.pressed]}>
          <View style={[styles.row, locked && styles.locked]}>
            <ExerciseIcon id={id} size={ICON_SIZE} radius={14} color={color} />
            <View style={styles.info}>
              <AppText variant="subtitle" weight="bold" numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="small" color={palette.textFaint} numberOfLines={1} style={styles.description}>
                {description}
              </AppText>
              {!locked && infoFooter}
            </View>
            {locked ? (
              <Ionicons name="lock-closed" size={16} color={palette.textFaint} />
            ) : (
              onAdd && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('exercises.addToPlan')}
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    onAdd();
                  }}
                  style={styles.add}
                >
                  <Ionicons name="add-circle" size={26} color={palette.accent} />
                </Pressable>
              )
            )}
          </View>
          {!locked && children}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: whiteAlpha(0.08),
  },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center' },
  locked: { opacity: 0.55 },
  info: { flex: 1, marginLeft: spacing.md },
  description: { marginTop: 6 },
  add: { marginLeft: spacing.sm, padding: spacing.xs },
});
