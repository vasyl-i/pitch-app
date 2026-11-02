import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { uk, ukContent } from './locales/uk';
import { pt, ptContent } from './locales/pt';
import { installPluralRules } from './pluralRules';

export const SUPPORTED_LANGUAGES = ['en', 'uk', 'pt'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Each language named in itself, so it's recognisable whatever the app is showing. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', uk: 'Українська', pt: 'Português' };

/** Emoji flags — native on iOS and Android, no assets to ship. Some swap by region, e.g. 🇺🇸 / 🇧🇷 (see `languageFlag`). */
export const LANGUAGE_FLAGS: Record<Language, string> = { en: '🇬🇧', uk: '🇺🇦', pt: '🇵🇹' };

/**
 * The i18next / CLDR code behind each app language. Portuguese is European
 * Portuguese: plain `pt` would pick Brazilian plural rules ("0 minuto").
 */
const I18NEXT_CODES: Record<Language, string> = { en: 'en', uk: 'uk', pt: 'pt-PT' };

export const resources = {
  en: { translation: en },
  uk: { translation: uk, content: ukContent },
  'pt-PT': { translation: pt, content: ptContent },
} as const;

// Hermes may lack Intl.PluralRules; without it every Ukrainian count but 1 reads as `_other`
installPluralRules();

/**
 * Initialised synchronously with English so pure `lib/` code (and node tests)
 * can call `t()` at any time. The device language is applied on app start by
 * `applyPreferredLanguage()` in `./device` (manual pick, else the phone).
 */
i18next.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: Object.values(I18NEXT_CODES),
  defaultNS: 'translation',
  ns: ['translation', 'content'],
  initAsync: false,
  returnNull: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// `{{skill, lowercase}}` — for English mid-sentence use of title-case labels
i18next.services.formatter?.add('lowercase', (value) => String(value).toLowerCase());

export const i18n = i18next;
export const t = i18next.t.bind(i18next);

export function currentLanguage(): Language {
  return SUPPORTED_LANGUAGES.find((l) => I18NEXT_CODES[l] === i18next.resolvedLanguage) ?? 'en';
}

export function changeLanguage(language: Language): Promise<unknown> {
  return i18next.changeLanguage(I18NEXT_CODES[language]);
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

/** Ukrainian or Portuguese when the phone's preferred language is one of them, English otherwise. */
export function resolveLanguage(languageCode: string | null | undefined): Language {
  const code = languageCode?.toLowerCase();
  return isLanguage(code) ? code : 'en';
}
