import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Card } from '@/shared/ui';
import { radii, spacing } from '@/shared/theme';

/** a headed block of the Progress tab: the title above its card */
export function ProgressSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <>
      <AppText variant="label" weight="medium" style={styles.title}>
        {title}
      </AppText>
      <Card style={styles.card}>{children}</Card>
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 36 },
  card: { marginTop: spacing.md, padding: spacing.xl, borderRadius: radii.md },
});
