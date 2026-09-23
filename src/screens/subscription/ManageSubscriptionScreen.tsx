/**
 * Premium account management — powered by RevenueCat Customer Center.
 *
 * The Customer Center provides a pre-built UI for subscription management:
 * plan details, cancellation, refund requests, and restore purchases.
 * Configured remotely in the RevenueCat dashboard.
 */
import { View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { fetchSubscriptionState, useSubscriptionStore } from '@/features/subscription';
import { BackButton, Screen } from '@/shared/ui';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function ManageSubscriptionScreen({ navigation }: ProfileScreenProps<'ManageSubscription'>) {
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
      <View style={{ paddingHorizontal: 16 }}>
        <BackButton onPress={handleDismiss} />
      </View>
      <RevenueCatUI.CustomerCenterView
        style={{ flex: 1 }}
        shouldShowCloseButton={false}
        onDismiss={handleDismiss}
      />
    </Screen>
  );
}
