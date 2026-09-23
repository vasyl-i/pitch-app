/**
 * Practice-reminder notification scheduler.
 *
 * Schedules a single daily local notification at the user's chosen time.
 * Cancels the previous reminder whenever the time changes or is set to null.
 *
 * Relies on expo-notifications — no server or FCM needed for local reminders.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const REMINDER_ID = 'practice-reminder';

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cancel any previously scheduled practice reminder. */
export async function cancelPracticeReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

/**
 * Schedule a daily practice reminder at the given local time.
 * Cancels any existing reminder first.
 */
export async function schedulePracticeReminder(hour: number, minute: number): Promise<void> {
  await cancelPracticeReminder();

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Time to practice',
      body: 'Your daily singing session is waiting for you.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Sync the scheduled notification with the current reminder preferences.
 * Call this on app start and whenever the preference changes.
 */
export async function syncReminder(reminderHour: number | null, reminderMinute: number): Promise<void> {
  if (reminderHour == null) {
    await cancelPracticeReminder();
  } else {
    await schedulePracticeReminder(reminderHour, reminderMinute);
  }
}

/**
 * Retrieve the device push token (FCM on Android, APNs on iOS)
 * and upsert it into the `device_tokens` table in Supabase.
 * Call once after sign-in when permissions are granted.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token) return;

    await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token: String(token),
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
  } catch {
    // Fails silently in simulator / Expo Go — push tokens are only
    // available on physical devices with a proper build.
  }
}

/** Remove all push tokens for the current device on sign-out. */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token) return;

    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', String(token));
  } catch {
    // Best-effort cleanup
  }
}

/** Configure how notifications are presented when the app is in the foreground. */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
