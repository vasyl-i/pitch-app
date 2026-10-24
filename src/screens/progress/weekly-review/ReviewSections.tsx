import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOCUS_TITLES, SKILL_LABELS, type buildWeeklyReview } from '@/features/learning';
import { AppText, Card, IconBubble } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

type Report = ReturnType<typeof buildWeeklyReview>;

/** a small stat card: icon, value, label */
export function ReviewTile({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Card style={styles.tile}>
      <IconBubble name={icon} size={28} iconSize={13} />
      <AppText variant="subtitle" weight="regular" style={styles.tileValue}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </Card>
  );
}

/** the week in plain words */
export function SummaryCard({ lines }: { lines: string[] }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <AppText variant="caption">{t('progress.review.plainLanguage')}</AppText>
      {lines.map((line) => (
        <AppText key={line} variant="small" style={styles.line}>
          {line}
        </AppText>
      ))}
    </Card>
  );
}

/** skills whose mastery moved this week, from → to */
export function MasteryChangesCard({ changes }: { changes: Report['masteryChanges'] }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <AppText variant="caption">{t('progress.review.masteryChanges')}</AppText>
      {changes.map((change) => {
        const up = change.to > change.from;
        return (
          <View key={change.skill} style={styles.change}>
            <AppText variant="small" style={styles.fill}>
              {SKILL_LABELS[change.skill]}
            </AppText>
            <AppText variant="caption">
              {change.from} → {change.to}
            </AppText>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={14} color={up ? palette.accent : palette.warning} />
          </View>
        );
      })}
    </Card>
  );
}

/** next week's recommended focus */
export function NextWeekCard({ focus }: { focus: Report['recommendedFocus'] }) {
  const { t } = useTranslation();
  return (
    <Card variant="highlighted" style={styles.card}>
      <AppText variant="caption">{t('progress.review.nextWeek')}</AppText>
      <AppText variant="subtitle" weight="regular" style={styles.focus}>
        {FOCUS_TITLES[focus]}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: spacing.md, alignItems: 'flex-start' },
  tileValue: { marginTop: spacing.xs },
  card: { padding: spacing.lg, marginTop: spacing.md },
  line: { marginTop: spacing.sm },
  change: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 },
  fill: { flex: 1 },
  focus: { marginTop: spacing.xs },
});
