import { useEffect } from 'react';
import { useSubscriptionStore } from '@/features/subscription';
import { cancelTrialEndingReminder, scheduleTrialEndingReminder } from '@/shared/lib/notifications';

/** Schedules or cancels the trial-ending push notification based on subscription state. */
export function TrialReminderSync() {
  const subscription = useSubscriptionStore((s) => s.subscription);

  useEffect(() => {
    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      scheduleTrialEndingReminder(subscription.trialEndsAt);
    } else {
      cancelTrialEndingReminder();
    }
  }, [subscription.status, subscription.trialEndsAt]);

  return null;
}
