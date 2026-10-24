import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';

/** a form's centred title and the line under it (often the email it's for) */
export function AuthHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon?: ReactNode }) {
  return (
    <View style={[styles.header, icon !== undefined && styles.withIcon]}>
      {icon}
      <AppText variant="title" center>
        {title}
      </AppText>
      <AppText variant="body" center>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
  withIcon: { gap: spacing.md },
});
