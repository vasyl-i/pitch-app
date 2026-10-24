import { StyleSheet, View } from 'react-native';
import { AppText, Button, FlowScreen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { ResultsCard } from '@/features/vocal-range';

/** the detected range on the score board, with "start over" and "save" at the bottom */
export function RangeResultsLayout({ title, subtitle, low, high, startOverLabel, saveLabel, onBack, onStartOver, onSave, busy = false }: {
  title: string;
  subtitle?: string;
  low: number;
  high: number;
  startOverLabel: string;
  saveLabel: string;
  onBack: () => void;
  onStartOver: () => void;
  onSave: () => void;
  busy?: boolean;
}) {
  return (
    <FlowScreen onBack={onBack}>
      <AppText variant="headline" center style={styles.title}>
        {title}
      </AppText>
      {subtitle !== undefined && (
        <AppText variant="label" center gradient style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
      <View style={styles.card}>
        <ResultsCard low={low} high={high} success />
      </View>
      <View style={styles.fill} />
      <View style={styles.actions}>
        <Button title={startOverLabel} variant="transparent" onPress={onStartOver} disabled={busy} />
        <Button title={saveLabel} onPress={onSave} disabled={busy} />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg, paddingBottom: spacing.xs },
  subtitle: { marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  card: { marginTop: spacing.xxl },
  fill: { flex: 1 },
  actions: { gap: spacing.md },
});
