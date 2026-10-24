import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/shared/theme';
import { BackButton } from './BackButton';
import { Screen } from './Screen';

/**
 * A step of a flow (range detection, its results): a fixed back button, then
 * content that fills the screen down to the home indicator — and scrolls
 * rather than clips when it doesn't fit a short phone.
 */
export function FlowScreen({ onBack, children }: PropsWithChildren<{ onBack: () => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <Screen noBottomPadding>
      <View style={styles.back}>
        <BackButton onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.fill, { paddingBottom: insets.bottom + spacing.lg }]}>{children}</View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', marginBottom: spacing.lg },
  scroll: { flexGrow: 1 },
  fill: { flex: 1 },
});
