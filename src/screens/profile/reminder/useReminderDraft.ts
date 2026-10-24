import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { usePreferencesStore } from '@/features/learning';
import { cancelPracticeReminder, requestNotificationPermissions, schedulePracticeReminder } from '@/shared/lib/notifications';
import { formatTime, t } from '@/shared/i18n';

/**
 * The reminder being edited: on or off and at what time, whether that differs
 * from what is saved, and saving it — scheduling (after asking for
 * notification permission) or cancelling the daily notification.
 */
export function useReminderDraft() {
  const storedHour = usePreferencesStore((s) => s.preferences?.reminderHour ?? null);
  const storedMinute = usePreferencesStore((s) => s.preferences?.reminderMinute ?? 0);
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const [enabled, setEnabled] = useState(storedHour != null);
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(storedHour ?? 19, storedMinute, 0, 0);
    return d;
  });

  const hasChanges =
    enabled !== (storedHour != null) || (enabled && (time.getHours() !== storedHour || time.getMinutes() !== storedMinute));

  const save = async () => {
    if (!enabled) {
      setPreferences({ reminderHour: null });
      await cancelPracticeReminder();
      Toast.show({ type: 'info', text1: t('profile.reminderSettings.disabledToast') });
      return;
    }
    const hour = time.getHours();
    const minute = time.getMinutes();
    setPreferences({ reminderHour: hour, reminderMinute: minute });
    if (await requestNotificationPermissions()) await schedulePracticeReminder(hour, minute);
    Toast.show({
      type: 'success',
      text1: t('profile.reminderSettings.saved'),
      text2: t('profile.reminderSettings.savedBody', { time: formatTime(time) }),
    });
  };

  return { enabled, toggle: () => setEnabled((on) => !on), time, setTime, hasChanges, save };
}
