import { useEffect } from 'react';
import { useLessonSessionStore, usePreferencesStore } from '@/features/learning';
import { setDailyTasksDoneDay, syncReminder } from '@/shared/lib/notifications';

/** Keeps the scheduled local notifications in sync with the reminder preference and today's progress. */

export function ReminderSync() {
  const reminderHour = usePreferencesStore((s) => s.preferences?.reminderHour ?? null);
  const reminderMinute = usePreferencesStore((s) => s.preferences?.reminderMinute ?? 0);

  // The day whose guided plan is fully done; the scheduler drops that day's catch-up nudge
  const dailyTasksDoneDay = useLessonSessionStore((s) =>
    s.steps.length > 0 && s.steps.every((step) => s.completedSlots.includes(step.slot)) ? s.planDate : null,
  );

  useEffect(() => {
    syncReminder(reminderHour, reminderMinute);
  }, [reminderHour, reminderMinute]);

  useEffect(() => {
    setDailyTasksDoneDay(dailyTasksDoneDay);
  }, [dailyTasksDoneDay]);

  return null;
}
