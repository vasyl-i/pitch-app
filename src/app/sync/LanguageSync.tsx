import { useEffect, useRef } from 'react';
import { rescheduleReminders } from '@/shared/lib/notifications';
import { setRevenueCatLocale } from '@/features/subscription';
import { intlLocale, useTranslation } from '@/shared/i18n';

/** Surfaces that don't read i18next themselves follow a language switch from here. */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const isFirstRun = useRef(true);

  useEffect(() => {
    void setRevenueCatLocale(intlLocale());
    // on launch the reminders were just planned in this language already
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    void rescheduleReminders();
  }, [i18n.language]);

  return null;
}
