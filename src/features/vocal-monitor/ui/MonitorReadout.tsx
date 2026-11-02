import { StyleSheet, View } from 'react-native';
import { AppText, Card, ProgressBar } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { stabilityLevel, type StabilityLevel } from '../lib/monitorMetrics';
import type { MonitorMetrics } from '../model/useVocalMonitor';

/** the tiles' colour before there is anything to measure */
const EMPTY = palette.textSecondary;

const LEVEL_COLOR: Record<StabilityLevel, string> = {
  steady: palette.accent,
  wobbly: palette.warning,
  unsteady: palette.danger,
};

/** accuracy and stability as two glass tiles: a value in words or a score, over a meter */
export function MonitorReadout({ metrics }: { metrics: MonitorMetrics }) {
  const { t } = useTranslation();
  const { accuracy, stability } = metrics;
  const level = stability === null ? null : stabilityLevel(stability);

  return (
    <View style={styles.row}>
      <Tile
        label={t('vocalMonitor.accuracy')}
        value={accuracy === null ? '—' : t('vocalMonitor.percent', { value: accuracy })}
        progress={(accuracy ?? 0) / 100}
        color={accuracy === null ? EMPTY : accuracy >= 75 ? palette.accent : accuracy >= 45 ? palette.warning : palette.danger}
      />
      <Tile
        label={t('vocalMonitor.stability')}
        value={level === null ? '—' : t(`vocalMonitor.level.${level}`)}
        progress={(stability ?? 0) / 100}
        color={level === null ? EMPTY : LEVEL_COLOR[level]}
      />
    </View>
  );
}

function Tile({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <Card style={styles.tile}>
      <View style={styles.tileBody}>
        <AppText variant="caption" color={palette.textSecondaryElevated}>
          {label}
        </AppText>
        <AppText variant="heading" color={color} gradient={false} style={styles.value}>
          {value}
        </AppText>
        <ProgressBar progress={progress} color={color} height={4} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  tileBody: { padding: spacing.lg, gap: spacing.xs },
  value: { marginBottom: spacing.sm },
});
