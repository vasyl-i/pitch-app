import { Pressable, StyleSheet, View } from 'react-native';
import type { SkillId } from '@/features/learning';
import { SKILL_LABELS } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { radii, spacing, whiteAlpha } from '@/shared/theme';
import { lineColor } from './useSkillTrend';

/** a chip per skill; tapping one shows or hides its line, coloured as drawn */
export function SkillLegend({ skills, selected, onToggle }: {
  skills: SkillId[];
  selected: Set<SkillId>;
  onToggle: (skill: SkillId) => void;
}) {
  const order = [...selected];
  return (
    <View style={styles.row}>
      {skills.map((skill) => {
        const active = selected.has(skill);
        return (
          <Pressable key={skill} onPress={() => onToggle(skill)} style={[styles.chip, active ? styles.activeChip : styles.inactiveChip]}>
            {active && <View style={[styles.swatch, { backgroundColor: lineColor(order.indexOf(skill)) }]} />}
            <AppText variant="caption">{SKILL_LABELS[skill]}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  activeChip: { backgroundColor: whiteAlpha(0.08) },
  inactiveChip: { opacity: 0.45 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
});
