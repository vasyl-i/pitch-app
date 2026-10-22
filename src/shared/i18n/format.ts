import { currentLanguage, t } from './i18n';

/** BCP-47 tag for `Intl` APIs matching the active app language. */
const INTL_LOCALES = { en: 'en-US', uk: 'uk-UA', pt: 'pt-PT' } as const;

export function intlLocale(): string {
  return INTL_LOCALES[currentLanguage()];
}

/** "7 PM" in English, "19" in Ukrainian and Portuguese (24-hour clock). */
export function formatHour(hour: number): string {
  const d = new Date(2000, 0, 1, hour, 0, 0, 0);
  return new Intl.DateTimeFormat(intlLocale(), { hour: 'numeric' }).format(d);
}

/** "7:30 PM" / "19:30". */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(intlLocale(), { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale(), options).format(date);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(), options).format(value);
}

const MODE_KEYS = {
  major: 'music.keyMajor',
  minor: 'music.keyMinor',
  dorian: 'music.keyDorian',
  lydian: 'music.keyLydian',
  mixolydian: 'music.keyMixolydian',
  chromatic: 'music.keyChromatic',
} as const;

/** Localise a stored English key name such as "C major" / "D dorian"; anything else passes through. */
export function formatKeyName(keyName: string): string {
  const match = /^(.+) (\w+)$/.exec(keyName);
  const modeKey = match ? MODE_KEYS[match[2].toLowerCase() as keyof typeof MODE_KEYS] : undefined;
  if (!match || !modeKey) return keyName;
  return t(modeKey, { tonic: match[1] });
}

/** Ukrainian solfège (До Ре Мі…) and sung vowels; real song lyrics are left as written. */
const UK_SYLLABLES: Record<string, string> = {
  Do: 'До',
  Re: 'Ре',
  Mi: 'Мі',
  Fa: 'Фа',
  Fi: 'Фі',
  Sol: 'Соль',
  La: 'Ля',
  Ti: 'Сі',
  Si: 'Сі',
  Ah: 'А',
  Ooh: 'У',
  Hey: 'Гей',
  Nay: 'Ней',
};

/** Portuguese solfège (Dó Ré Mi…) and sung vowels. */
const PT_SYLLABLES: Record<string, string> = {
  Do: 'Dó',
  Re: 'Ré',
  Fa: 'Fá',
  La: 'Lá',
  Ti: 'Si',
  Ah: 'Á',
  Ooh: 'U',
};

const SYLLABLES = { en: {}, uk: UK_SYLLABLES, pt: PT_SYLLABLES } as const satisfies Record<string, Record<string, string>>;

export function formatLyric(lyric: string): string {
  const table: Record<string, string> = SYLLABLES[currentLanguage()];
  return table[lyric] ?? lyric;
}
