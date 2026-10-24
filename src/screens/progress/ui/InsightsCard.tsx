import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { buildSessionInsights } from '@/features/learning';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { progressCardStyles } from './ChartCard';

type Insight = ReturnType<typeof buildSessionInsights>[number];

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = { improvement: 'trending-up', decline: 'trending-down' };

/** "After your last session": a line per thing that moved */
export function InsightsCard({ insights }: { insights: Insight[] }) {
  const { t } = useTranslation();
  return (
    <Card style={progressCardStyles.card}>
      <AppText variant="caption">{t('progress.afterLast')}</AppText>
      {insights.map((insight) => (
        <View key={insight.text} style={styles.row}>
          <Ionicons
            name={ICON[insight.kind] ?? 'analytics'}
            size={14}
            color={insight.kind === 'improvement' ? palette.accent : palette.textFaint}
          />
          <AppText variant="small" style={styles.text}>
            {insight.text}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  text: { flex: 1 },
});
