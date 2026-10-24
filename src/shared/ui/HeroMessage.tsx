import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, spacing } from '@/shared/theme';
import { AppText } from './AppText';

/**
 * The full-screen "state" layout: an illustration, a big gradient title and
 * a line of explanation, centred, with any actions (children) beneath — mic
 * checks, permission prompts, empty and done states.
 */
export function HeroMessage({ illustration, title, body, style, children }: PropsWithChildren<{
  illustration?: ReactNode;
  title: string;
  body?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View style={[styles.column, style]}>
      {illustration}
      <AppText variant="score" center gradient>
        {title}
      </AppText>
      {body !== undefined && (
        <AppText variant="heading" weight="regular" color={palette.textSecondaryElevated} center style={styles.body}>
          {body}
        </AppText>
      )}
      {children}
    </View>
  );
}

/** the actions under a HeroMessage: full width, stacked */
export function HeroActions({ children }: PropsWithChildren) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, gap: spacing.xl },
  body: { marginTop: spacing.sm },
  actions: { width: '100%', gap: spacing.md, marginTop: spacing.xl },
});
