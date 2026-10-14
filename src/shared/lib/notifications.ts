/**
 * Practice-reminder notification scheduler.
 *
 * Schedules a rolling window of local notifications, one per day each with a
 * randomly picked message:
 * - the daily reminder at the user's chosen time;
 * - an evening catch-up nudge when the day's tasks are still unfinished
 *   (see CATCH_UP_RULES).
 *
 * Local notifications can't run code when they fire, so every condition is
 * decided at scheduling time and the window is re-synced whenever an input
 * changes (reminder time, today's tasks finished). Syncing is a diff against
 * what is already pending: notifications are keyed by their fire time, so an
 * unchanged one keeps its message and only the differences are scheduled or
 * cancelled.
 *
 * Relies on expo-notifications — no server or FCM needed for local reminders.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const REMINDER_ID = 'practice-reminder';
const CATCH_UP_ID = 'catch-up-reminder';
const TRIAL_REMINDER_ID = 'trial-ending-reminder';

/**
 * How many days of notifications to schedule ahead. A repeating DAILY trigger
 * would replay the same copy forever, so each day gets its own one-shot
 * notification with its own message. The window is refilled on every app
 * launch (see `syncReminder`). iOS caps pending notifications at 64: two per
 * day plus the trial reminder must stay under that.
 */
const REMINDER_DAYS_AHEAD = 30;

/**
 * The evening catch-up nudge fires on a day only when all of these hold.
 */
const CATCH_UP_RULES = {
  /** the daily reminder was shown earlier that day (no catch-up when reminders are off) */
  requireDailyReminderShown: true,
  /** minimum gap after the daily reminder */
  minMinutesAfterDailyReminder: 60,
  /** not before this local time */
  earliestTime: { hour: 20, minute: 0 },
  /** the day's guided tasks aren't finished yet */
  skipWhenDailyTasksDone: true,
} as const;

interface NotificationMessage {
  title: string;
  body: string;
}

const REMINDER_MESSAGES: readonly NotificationMessage[] = [
  { title: 'No time for a full practice?', body: 'Five minutes is enough to show up for your voice today.' },
  { title: 'Can you hear the difference? 👂', body: "Come back for today's pitch workout and see how you're doing." },
  { title: 'One note closer 🎵', body: 'Build your pitch accuracy one small practice at a time.' },
  { title: 'Your vocal gym is calling 🎤', body: 'Ready for a quick workout? Your next note is waiting.' },
  { title: 'Your voice grows with practice. 🎶', body: 'A tiny workout. A meaningful step.' },
  { title: "Let's make those notes yours.", body: 'Five minutes. One small win.' },
  { title: 'Your next breakthrough starts with one note.', body: 'Keep your ears curious. 👂' },
  { title: 'Ready to find your pitch?', body: 'Your voice deserves five minutes today.' },
];

const CATCH_UP_MESSAGES: readonly NotificationMessage[] = [
  { title: 'A little music before the day ends 🌙', body: 'Take five minutes for yourself and your voice.' },
  { title: 'Every comeback counts 🩵', body: "Missed a day? No worries. Let's pick up where you left off." },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local `YYYY-MM-DD`, the same format as the lesson plan's dayKey. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Keyed by fire time, so a pending notification that still matches the plan is left alone. */
const notificationId = (prefix: string, fireAt: Date) =>
  `${prefix}-${localDateKey(fireAt)}-${pad2(fireAt.getHours())}${pad2(fireAt.getMinutes())}`;

/** Random message that differs from `previousTitle`, so no two days in a row match. */
function pickMessage(messages: readonly NotificationMessage[], previousTitle?: string): NotificationMessage {
  const candidates = messages.length > 1 ? messages.filter((m) => m.title !== previousTitle) : messages;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

interface ReminderTime {
  hour: number;
  minute: number;
}

interface PlannedNotification {
  id: string;
  fireAt: Date;
  messages: readonly NotificationMessage[];
}

/** When the catch-up should fire on `day`, or null when it shouldn't fire that day at all. */
function catchUpTime(day: Date, reminderAt: Date | null): Date | null {
  const { requireDailyReminderShown, minMinutesAfterDailyReminder, earliestTime } = CATCH_UP_RULES;
  const earliest = new Date(day.getFullYear(), day.getMonth(), day.getDate(), earliestTime.hour, earliestTime.minute);
  if (!reminderAt) return requireDailyReminderShown ? null : earliest;

  const afterReminder = new Date(reminderAt.getTime() + minMinutesAfterDailyReminder * 60_000);
  const fireAt = afterReminder > earliest ? afterReminder : earliest;
  // A late reminder can push the catch-up past midnight — that's no longer "today"
  return localDateKey(fireAt) === localDateKey(day) ? fireAt : null;
}

function planNotifications(
  now: Date,
  reminder: ReminderTime | null,
  doneDay: string | null,
  pendingIds: ReadonlySet<string>,
): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  for (let offset = 0; offset < REMINDER_DAYS_AHEAD; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const reminderAt = reminder
      ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), reminder.hour, reminder.minute)
      : null;
    if (reminderAt && reminderAt > now) {
      plan.push({ id: notificationId(REMINDER_ID, reminderAt), fireAt: reminderAt, messages: REMINDER_MESSAGES });
    }

    const catchUpAt = catchUpTime(day, reminderAt);
    if (!catchUpAt || catchUpAt <= now) continue;
    if (CATCH_UP_RULES.skipWhenDailyTasksDone && localDateKey(day) === doneDay) continue;
    const id = notificationId(CATCH_UP_ID, catchUpAt);
    // Today's reminder already fired before this sync. Whether it was actually
    // shown is only known from the catch-up scheduled alongside it back then.
    if (CATCH_UP_RULES.requireDailyReminderShown && reminderAt && reminderAt <= now && !pendingIds.has(id)) continue;
    plan.push({ id, fireAt: catchUpAt, messages: CATCH_UP_MESSAGES });
  }
  return plan.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/** undefined until the first sync, so an early sync can't wipe reminders it doesn't know about yet */
let reminderTime: ReminderTime | null | undefined;
let dailyTasksDoneDay: string | null = null;
let syncQueue: Promise<void> = Promise.resolve();
/** Catch-ups planned this session, so one cancelled for finished tasks comes back if a step is redone. */
const plannedCatchUps = new Set<string>();

/** Diff the pending reminders against the plan. Runs one at a time (see `resync`). */
async function applyReminderPlan(): Promise<void> {
  if (reminderTime === undefined) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  // The prefix also matches the legacy single DAILY reminder, which used the bare REMINDER_ID
  const pending = new Map(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID) || n.identifier.startsWith(CATCH_UP_ID))
      .map((n) => [n.identifier, n.content.title ?? undefined]),
  );

  const knownIds = new Set([...pending.keys(), ...plannedCatchUps]);
  const plan = planNotifications(new Date(), reminderTime, dailyTasksDoneDay, knownIds);
  const plannedIds = new Set(plan.map((p) => p.id));
  for (const id of plannedIds) if (id.startsWith(CATCH_UP_ID)) plannedCatchUps.add(id);
  const stale = [...pending.keys()].filter((id) => !plannedIds.has(id));
  await Promise.all(stale.map((id) => Notifications.cancelScheduledNotificationAsync(id)));

  if (plan.every((p) => pending.has(p.id))) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const previousTitle = new Map<readonly NotificationMessage[], string | undefined>();
  for (const { id, fireAt, messages } of plan) {
    if (pending.has(id)) {
      previousTitle.set(messages, pending.get(id));
      continue;
    }
    const { title, body } = pickMessage(messages, previousTitle.get(messages));
    previousTitle.set(messages, title);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
  }
}

/** Callers fire syncs from several effects at once; queue them so diffs don't interleave. */
function resync(): Promise<void> {
  const run = syncQueue.then(applyReminderPlan);
  syncQueue = run.catch(() => {});
  return run;
}

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cancel the practice reminders, and the catch-ups that depend on them. */
export function cancelPracticeReminder(): Promise<void> {
  reminderTime = null;
  return resync();
}

/**
 * Schedule daily practice reminders at the given local time for the next
 * REMINDER_DAYS_AHEAD days, each with a randomly picked message, along with
 * their evening catch-ups. Replaces reminders scheduled for another time.
 */
export function schedulePracticeReminder(hour: number, minute: number): Promise<void> {
  reminderTime = { hour, minute };
  return resync();
}

/**
 * Tell the scheduler which day's guided tasks are finished (local
 * `YYYY-MM-DD`, or null) so that day's catch-up is dropped — or restored
 * if a step is redone.
 */
export function setDailyTasksDoneDay(dayKey: string | null): Promise<void> {
  if (dayKey === dailyTasksDoneDay) return syncQueue;
  dailyTasksDoneDay = dayKey;
  return resync();
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
    // getDevicePushTokenAsync() hangs indefinitely in the simulator / Expo Go
    // where no APNs/FCM registration exists. A short timeout keeps it from
    // blocking account deletion or sign-out.
    const tokenResult = await Promise.race([
      Notifications.getDevicePushTokenAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    const token = tokenResult?.data;
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

/**
 * Schedule a one-time push notification for the day before a trial ends,
 * reminding the user that billing starts tomorrow. Silently no-ops if
 * the trial end date is in the past or permissions aren't granted.
 */
export async function scheduleTrialEndingReminder(trialEndsAt: number): Promise<void> {
  await cancelTrialEndingReminder();

  // Fire at 10:00 AM the day before the trial ends
  const fireAt = new Date(trialEndsAt);
  fireAt.setDate(fireAt.getDate() - 1);
  fireAt.setHours(10, 0, 0, 0);

  if (fireAt.getTime() <= Date.now()) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_REMINDER_ID,
    content: {
      title: 'Your free trial ends tomorrow',
      body: 'Just a heads-up — your subscription will start tomorrow. You can manage it anytime in settings.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

/** Cancel any previously scheduled trial-ending reminder. */
export async function cancelTrialEndingReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID);
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
