import { Linking } from 'react-native';
import { useProfileStore, voiceType } from '@/entities/profile';
import { useAuthStore } from '@/features/auth';
import { GOAL_LABELS, usePreferencesStore } from '@/features/learning';
import { SOUND_TYPE_LABELS, useSoundStore } from '@/shared/audio';
import { midiToName } from '@/shared/lib/music';
import { currentLanguage, formatTime, LANGUAGE_NAMES, t, useTranslation } from '@/shared/i18n';
import { languageFlag, savedLanguage } from '@/shared/i18n/device';
import type { ProfileScreenProps } from '@/app/navigation/types';
import type { SettingsRowData } from './SettingsGroup';
import { openFeedbackEmail, useAccountActions } from './useAccountActions';

const ICONS = {
  microphone: require('../../../../assets/account-tab/microphone.png'),
  sound: require('../../../../assets/account-tab/sound.png'),
  goals: require('../../../../assets/account-tab/goals.png'),
  weeklyPlan: require('../../../../assets/account-tab/weekly-plan.png'),
  reminder: require('../../../../assets/account-tab/reminder.png'),
  privacyPolicy: require('../../../../assets/account-tab/privacy-policy.png'),
  terms: require('../../../../assets/account-tab/terms.png'),
  logOut: require('../../../../assets/account-tab/log-out.png'),
  delete: require('../../../../assets/account-tab/delete.png'),
  message: require('../../../../assets/account-tab/message.png'),
  settings: require('../../../../assets/account-tab/settings.png'),
};

const PRIVACY_URL = 'https://pitchgym.anyabedrytska.com/privacy-policy.html';
const TERMS_URL = 'https://pitchgym.anyabedrytska.com/terms-of-service.html';

function reminderSubtitle(hour: number | null, minute: number, compact: boolean): string {
  if (hour == null) return compact ? t('profile.compact.reminderOff') : t('profile.reminderOff');
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  return t('profile.reminderDaily', { time: formatTime(at) });
}

/**
 * The Account tab's groups as data: each row's icon, title, current value and
 * where it leads. `compact` picks the shorter `profile.compact` copy for
 * narrow phones.
 */
export function useAccountSections(navigation: ProfileScreenProps<'ProfileHome'>['navigation'], compact: boolean) {
  useTranslation(); // re-render on a language switch
  const range = useProfileStore((s) => s.profile?.comfortRange ?? null);
  const prefs = usePreferencesStore((s) => s.preferences);
  const soundType = useSoundStore((s) => s.soundType);
  const guest = useAuthStore((s) => s.guest);
  const isEmailUser = useAuthStore((s) => s.user?.app_metadata?.provider === 'email');
  const { logOut, deleteAccount } = useAccountActions();
  const pick = (full: string, short: string) => (compact ? short : full);
  const language = LANGUAGE_NAMES[currentLanguage()];

  const settings: SettingsRowData[] = [
    {
      key: 'range',
      icon: ICONS.microphone,
      title: t('vocalRange.settings.title'),
      subtitle: range ? `${midiToName(range.lowMidi)} — ${midiToName(range.highMidi)} · ≈${voiceType(range)}` : t('profile.notMeasured'),
      onPress: () => navigation.navigate('VocalRangeSettings'),
    },
    {
      key: 'sound',
      icon: ICONS.sound,
      title: t('profile.sound'),
      subtitle: t('profile.soundWave', { sound: SOUND_TYPE_LABELS[soundType] }),
      onPress: () => navigation.navigate('SoundSettings'),
    },
    {
      key: 'goal',
      icon: ICONS.goals,
      title: t('profile.goal'),
      subtitle: prefs
        ? `${GOAL_LABELS[prefs.primaryGoal]} · ${pick(t('profile.minutesADay', { count: prefs.dailyMinutes }), t('common.minutesShort', { count: prefs.dailyMinutes }))}`
        : t('profile.goalUnset'),
      onPress: () => navigation.navigate('LearningPreferences'),
    },
    {
      key: 'exercises',
      icon: ICONS.settings,
      title: t('profile.exerciseSettings'),
      subtitle: pick(t('profile.exerciseSettingsSubtitle'), t('profile.compact.exerciseSettingsSubtitle')),
      onPress: () => navigation.navigate('ExerciseSettings'),
    },
    {
      key: 'weekly',
      icon: ICONS.weeklyPlan,
      title: t('profile.weeklyPlan'),
      subtitle: pick(t('profile.weeklyPlanSubtitle'), t('profile.compact.weeklyPlanSubtitle')),
      onPress: () => navigation.navigate('WeeklyPlan'),
    },
    {
      key: 'reminder',
      icon: ICONS.reminder,
      title: t('profile.reminder'),
      subtitle: reminderSubtitle(prefs?.reminderHour ?? null, prefs?.reminderMinute ?? 0, compact),
      onPress: () => navigation.navigate('ReminderSettings'),
    },
    {
      // follows the phone until a language is picked here
      key: 'language',
      icon: languageFlag(currentLanguage()),
      title: t('profile.language'),
      subtitle: savedLanguage()
        ? language
        : pick(t('profile.languageSubtitle', { language }), t('profile.compact.languageSubtitle', { language })),
      onPress: () => navigation.navigate('LanguageSettings'),
    },
  ];

  const legal: SettingsRowData[] = [
    { key: 'privacy', icon: ICONS.privacyPolicy, title: t('profile.privacy'), subtitle: t('profile.privacySubtitle'), onPress: () => Linking.openURL(PRIVACY_URL) },
    {
      key: 'terms',
      icon: ICONS.terms,
      title: t('profile.terms'),
      subtitle: pick(t('profile.termsSubtitle'), t('profile.compact.termsSubtitle')),
      onPress: () => Linking.openURL(TERMS_URL),
    },
  ];

  const account: SettingsRowData[] = [
    ...(isEmailUser
      ? [
          {
            key: 'password',
            icon: ICONS.settings,
            title: t('auth.newPassword.changeTitle'),
            subtitle: pick(t('profile.changePasswordSubtitle'), t('profile.compact.changePasswordSubtitle')),
            onPress: () => navigation.navigate('NewPassword', { requireOldPassword: true }),
          },
        ]
      : []),
    {
      key: 'logout',
      icon: ICONS.logOut,
      title: t('profile.logOut'),
      subtitle: guest ? pick(t('profile.logOutGuest'), t('profile.compact.logOutGuest')) : t('profile.logOutSubtitle'),
      onPress: logOut,
    },
    ...(!guest
      ? [
          {
            key: 'delete',
            icon: ICONS.delete,
            title: t('profile.deleteAccount'),
            subtitle: pick(t('profile.deleteAccountSubtitle'), t('profile.compact.deleteAccountSubtitle')),
            onPress: deleteAccount,
            destructive: true,
          },
        ]
      : []),
  ];

  const feedback: SettingsRowData[] = [
    {
      key: 'feedback',
      icon: ICONS.message,
      title: pick(t('profile.feedback'), t('profile.compact.feedback')),
      subtitle: pick(t('profile.feedbackSubtitle'), t('profile.compact.feedbackSubtitle')),
      onPress: openFeedbackEmail,
    },
  ];

  return [
    { label: t('profile.sections.settings'), rows: settings },
    { label: t('profile.sections.legal'), rows: legal },
    { label: t('profile.sections.account'), rows: account },
    { label: t('profile.sections.feedback'), rows: feedback },
  ];
}
