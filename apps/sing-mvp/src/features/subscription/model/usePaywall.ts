/**
 * One way to open the paywall, from anywhere.
 *
 * Every lock in the app routes through this hook so that attribution ("which
 * gate sent them?") is captured automatically rather than remembered by each
 * call site — the single most useful thing to know about a paywall.
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { trackMonetization, type PaywallSource } from '../lib/analytics';
import type { PremiumFeature } from './types';

/** structural: any navigator that can reach the root Paywall route fits */
interface PaywallNavigation {
  navigate(screen: 'Paywall', params: { source: PaywallSource; feature?: PremiumFeature }): void;
}

export function usePaywall(source: PaywallSource, feature?: PremiumFeature) {
  const navigation = useNavigation() as unknown as PaywallNavigation;

  return useCallback(() => {
    if (feature) trackMonetization({ type: 'gate_tapped', feature, source });
    navigation.navigate('Paywall', { source, feature });
  }, [navigation, source, feature]);
}
