import { AppState } from 'react-native';
import { getLocales } from 'expo-localization';
import { mmkv } from '@/shared/lib/storage';
import { changeLanguage, currentLanguage, isLanguage, LANGUAGE_FLAGS, resolveLanguage, type Language } from './i18n';

const LANGUAGE_KEY = 'settings.language';

/**
 * The phone's language (or the per-app language picked in iOS/Android
 * Settings, which `getLocales()` reports first). Kept out of `./i18n` so pure
 * code and node tests never touch the native modules.
 */
export function deviceLanguage(): Language {
  return resolveLanguage(getLocales()[0]?.languageCode);
}

/** Regional flags that replace the default one for phones set to that region. */
const REGIONAL_FLAGS: Partial<Record<Language, Record<string, string>>> = {
  en: { US: '🇺🇸' },
  pt: { BR: '🇧🇷' },
};

/** The flag shown for a language — 🇺🇸 for English on US phones, 🇧🇷 for Portuguese on Brazilian ones. */
export function languageFlag(language: Language): string {
  const region = getLocales()[0]?.regionCode;
  return (region && REGIONAL_FLAGS[language]?.[region]) || LANGUAGE_FLAGS[language];
}

/** The language picked in Account → Language, or null while the app still follows the phone. */
export function savedLanguage(): Language | null {
  const saved = mmkv.getString(LANGUAGE_KEY);
  return isLanguage(saved) ? saved : null;
}

/** The manual pick when there is one; otherwise the phone's language (Ukrainian / Portuguese, else English). */
export function preferredLanguage(): Language {
  return savedLanguage() ?? deviceLanguage();
}

export function applyPreferredLanguage(): void {
  const next = preferredLanguage();
  if (currentLanguage() !== next) void changeLanguage(next);
}

/** Persist a manual pick and switch to it live — from then on the phone's language is ignored. */
export function setAppLanguage(language: Language): void {
  mmkv.set(LANGUAGE_KEY, language);
  applyPreferredLanguage();
}

/**
 * Android can change the locale without restarting the app — re-check when
 * the app returns to the foreground (a no-op once the user picked a language).
 * Returns an unsubscribe function.
 */
export function startDeviceLanguageSync(): () => void {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') applyPreferredLanguage();
  });
  return () => sub.remove();
}
