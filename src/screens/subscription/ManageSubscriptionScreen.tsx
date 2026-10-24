/**
 * Premium account management — powered by RevenueCat Customer Center.
 *
 * The Customer Center provides a pre-built UI for subscription management:
 * plan details, cancellation, refund requests, and restore purchases.
 * Configured remotely in the RevenueCat dashboard.
 */
import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { fetchSubscriptionState, useSubscriptionStore } from '@/features/subscription';
import { BackButton, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

export function ManageSubscriptionScreen({ navigation }: RootScreenProps<'ManageSubscription'>) {
  const handleDismiss = async () => {
    // Sync any changes made in Customer Center back to our store
    try {
      const state = await fetchSubscriptionState();
      useSubscriptionStore.getState().syncSubscription(state);
    } catch {
      // Non-critical
    }
    navigation.goBack();
  };

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <View style={styles.back}>
        <BackButton onPress={handleDismiss} />
      </View>
      <RevenueCatUI.CustomerCenterView
        style={styles.fill}
        shouldShowCloseButton={false}
        onDismiss={handleDismiss}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: spacing.lg },
  fill: { flex: 1 },
});
