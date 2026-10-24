import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { AmpMaskView } from '@amplitude/plugin-session-replay-react-native';
import { BackButton, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';

/**
 * An auth form screen: keyboard-aware, an optional back button, and the form
 * centred — masked from session replay, since it holds email and passwords.
 */
export function AuthLayout({ onBack, children }: PropsWithChildren<{ onBack?: () => void }>) {
  return (
    <Screen dismissKeyboard avoidKeyboard>
      {onBack && (
        <View style={styles.back}>
          <BackButton onPress={onBack} />
        </View>
      )}
      <AmpMaskView mask="amp-block" style={styles.fill}>
        <View style={styles.form}>{children}</View>
      </AmpMaskView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: spacing.lg },
  fill: { flex: 1 },
  form: { flex: 1, justifyContent: 'center', gap: spacing.xl },
});
