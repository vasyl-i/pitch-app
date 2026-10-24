import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/ui';
import { spacing } from '@/shared/theme';

/** a card with a small caption heading over its chart */
export function ChartCard({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <Card style={styles.card}>
      {title !== undefined && <AppText variant="caption">{title}</AppText>}
      <View style={title !== undefined && styles.body}>{children}</View>
    </Card>
  );
}

export const progressCardStyles = StyleSheet.create({
  card: { padding: 18, marginTop: spacing.md },
});

const styles = StyleSheet.create({
  card: progressCardStyles.card,
  body: { marginTop: spacing.md },
});
