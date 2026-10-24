import { useEffect } from 'react';
import { Platform } from 'react-native';
import { isPremium, useSubscriptionStore } from '@/features/subscription';
import { setUserProperties } from '@/shared/lib/analytics';

/** Keeps Amplitude user properties in sync with subscription and profile state. */
export function UserPropertiesSync() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const premium = isPremium(subscription);

  useEffect(() => {
    setUserProperties({
      subscription_status: subscription.status,
      is_premium: premium,
      platform: Platform.OS,
    });
  }, [subscription.status, premium]);

  return null;
}
