import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';

/** one of today's numbers: icon, value, label */
export function CompleteStatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      {icon}
      <AppText variant="title" weight="medium" color={palette.white} gradient={false} style={styles.value}>
        {value}
      </AppText>
      <AppText variant="small" color={palette.white} gradient={false} style={styles.label}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, paddingVertical: 20, paddingHorizontal: spacing.xl, alignItems: 'flex-start', gap: 10, borderRadius: 10 },
  value: { marginTop: spacing.sm },
  label: { marginTop: 2 },
});
