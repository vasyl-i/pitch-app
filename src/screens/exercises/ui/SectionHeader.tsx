import { StyleSheet, View } from 'react-native';
import { PremiumBadge } from '@/features/subscription';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';

/** a library section's name and tagline, badged when the whole section is Premium */
export function SectionHeader({ label, tagline, locked }: { label: string; tagline?: string; locked: boolean }) {
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <AppText variant="subtitle" weight="regular" style={styles.label}>
          {label}
        </AppText>
        {locked && <PremiumBadge locked />}
      </View>
      {!!tagline && (
        <AppText variant="small" style={styles.tagline}>
          {tagline}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { marginBottom: 6 },
  tagline: { marginBottom: spacing.xs },
});
