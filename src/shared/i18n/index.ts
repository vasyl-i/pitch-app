/**
 * Localisation. English and Ukrainian; the phone's language decides which
 * (Ukrainian if the preferred language is Ukrainian, English otherwise).
 *
 * - UI strings: typed keys in `locales/<lng>/*.ts` — use `useTranslation()`
 *   in components and `t()` in non-React code.
 * - Domain content (exercise titles etc.): English inline, Ukrainian overlay
 *   in `locales/uk/content.ts`, wired through `localizeContent()`.
 */
export { i18n, t, currentLanguage, changeLanguage, isLanguage, resolveLanguage, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from './i18n';
export type { Language } from './i18n';
export { localizeContent, localizeRecord, contentText, translatedRecord } from './content';
export { useTranslation, Trans } from 'react-i18next';
export { intlLocale, formatHour, formatTime, formatDate, formatNumber, formatKeyName, formatLyric } from './format';
