import { Pressable, StyleSheet } from 'react-native';
import { SKILL_LABELS, type SkillId, type WeeklyReport } from '@/features/learning';
import { AppText, TrendIcon } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** each skill that moved in the last 7 days, from → to; a row opens the skill's history */
export function MasteryChanges({ changes, onOpen }: {
  changes: WeeklyReport['masteryChanges'];
  onOpen: (skill: SkillId) => void;
}) {
  const { t } = useTranslation();
  if (changes.length === 0) {
    return (
      <AppText variant="small" color={palette.textFaint}>
        {t('progress.masteryEmpty')}
      </AppText>
    );
  }
  return changes.map((change, i) => (
    <Pressable
      key={change.skill}
      accessibilityRole="button"
      accessibilityHint={t('progress.stats.openHistory')}
      onPress={() => onOpen(change.skill)}
      style={({ pressed }) => [styles.row, i > 0 && styles.spaced, pressed && styles.pressed]}
    >
      <AppText variant="small" color={palette.textFaint} style={styles.label}>
        {SKILL_LABELS[change.skill]}
      </AppText>
      <AppText variant="small" color={palette.textFaint}>
        {t('progress.masteryChange', { from: Math.round(change.from), to: Math.round(change.to) })}
      </AppText>
      <TrendIcon down={change.to < change.from} />
    </Pressable>
  ));
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spaced: { marginTop: spacing.lg },
  pressed: { opacity: 0.6 },
  label: { flex: 1 },
});
