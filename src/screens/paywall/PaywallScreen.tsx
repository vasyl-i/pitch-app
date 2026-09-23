/**
 * The paywall — powered by RevenueCat's remote paywall.
 *
 * Uses RevenueCat's Paywall component which renders a paywall configured in
 * the RevenueCat dashboard. This gives full remote control over pricing,
 * layout, trial copy, and A/B testing without app updates.
 */
import { useEffect } from 'react';
import RevenueCatUI from 'react-native-purchases-ui';
import Toast from 'react-native-toast-message';
import {
  trackMonetization,
  usePremiumStatus,
  useSubscriptionStore,
  fetchSubscriptionState,
} from '@/features/subscription';
import type { RootScreenProps } from '@/app/navigation/types';

export function PaywallScreen({ navigation, route }: RootScreenProps<'Paywall'>) {
  const source = route.params?.source ?? 'unknown';
  const isFromOnboarding = source === 'onboarding';
  const { trialEligible, isPremium } = usePremiumStatus();

  useEffect(() => {
    trackMonetization({ type: 'paywall_viewed', source, trialEligible });
  }, [source, trialEligible]);

  // Active subscriber — dismiss immediately (skip for onboarding, handled in purchase)
  useEffect(() => {
    if (isPremium && !isFromOnboarding) navigation.goBack();
  }, [isPremium, isFromOnboarding, navigation]);

  const goToMain = () => {
    navigation.replace('Main', { screen: 'HomeTab', params: { screen: 'Today' } });
  };

  const handleDismiss = () => {
    trackMonetization({ type: 'paywall_dismissed', source });
    if (isFromOnboarding) {
      goToMain();
    } else {
      navigation.goBack();
    }
  };

  const handlePurchaseCompleted = async () => {
    try {
      const state = await fetchSubscriptionState();
      useSubscriptionStore.getState().syncSubscription(state);
    } catch {
      // State will sync on next app start via the listener
    }
    trackMonetization({ type: 'purchase_completed', source, planId: 'yearly', withTrial: trialEligible });
    // Navigate first, then show toast on the destination screen
    if (isFromOnboarding) {
      goToMain();
    } else {
      navigation.goBack();
    }
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Welcome to Premium!',
        text2: 'All features are now unlocked',
      });
    }, 500);
  };

  const handleRestoreCompleted = async () => {
    try {
      const state = await fetchSubscriptionState();
      useSubscriptionStore.getState().syncSubscription(state);
    } catch {
      // Non-critical
    }
    trackMonetization({ type: 'restore_completed', planId: null });
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Purchase restored',
        text2: 'Your Premium access is back',
      });
    }, 500);
  };

  return (
    <RevenueCatUI.Paywall
      style={{ flex: 1 }}
      options={{
        displayCloseButton: true,
      }}
      onDismiss={handleDismiss}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
    />
  );
}
