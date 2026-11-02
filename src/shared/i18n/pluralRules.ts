/**
 * Plural categories for the app's three languages, and — when the JS engine's
 * own `Intl.PluralRules` can't be trusted — a stand-in for it.
 *
 * i18next picks `_one/_few/_many/_other` through `Intl.PluralRules`. When the
 * engine lacks it (or doesn't know a locale) i18next silently falls back to a
 * dummy rule: `one` for exactly 1, `other` for everything else. In Ukrainian
 * that turns "3 кроки" into the `_other` string, and 21 into `_other` instead
 * of `_one`. Node always has the real thing, so tests can't catch it — this
 * file pins the rules (CLDR, integers only) and `installPluralRules()` swaps
 * them in whenever the engine fails a probe.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const RULES: Record<string, { categories: PluralCategory[]; select: (n: number) => PluralCategory }> = {
  en: {
    categories: ['one', 'other'],
    select: (n) => (n === 1 ? 'one' : 'other'),
  },
  uk: {
    categories: ['few', 'many', 'one', 'other'],
    select(n) {
      if (!Number.isInteger(n)) return 'other';
      const m10 = n % 10;
      const m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'one';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
      return 'many';
    },
  },
  // European Portuguese: 1 is `one` (0 is not — that's the Brazilian rule), whole millions are `many`
  pt: {
    categories: ['many', 'one', 'other'],
    select(n) {
      if (n === 1) return 'one';
      if (Number.isInteger(n) && n !== 0 && n % 1_000_000 === 0) return 'many';
      return 'other';
    },
  },
};

/** the category of `n` in `language` (`en`, `uk`, `pt`) */
export function pluralCategory(language: string, n: number): PluralCategory {
  return (RULES[language] ?? RULES.en).select(Math.abs(n));
}

const languageOf = (locales?: string | readonly string[]) => (Array.isArray(locales) ? locales[0] : (locales as string | undefined) ?? 'en').toLowerCase().split(/[-_]/)[0];

/** what the engine must get right for a language before we trust it */
const PROBES: [string, number, PluralCategory][] = [
  ['en', 1, 'one'],
  ['uk', 3, 'few'],
  ['uk', 5, 'many'],
  ['pt-PT', 1, 'one'],
];

function engineIsTrustworthy(): boolean {
  try {
    return PROBES.every(([locale, n, expected]) => new Intl.PluralRules(locale).select(n) === expected);
  } catch {
    return false;
  }
}

/** an `Intl.PluralRules` for en/uk/pt (cardinal); other languages go to the engine, or throw as an unsupported locale would */
function makeShim(native: typeof Intl.PluralRules | undefined) {
  return class PluralRulesShim {
    private readonly language: string;
    private readonly locale: string;
    private readonly fallback?: Intl.PluralRules;

    constructor(locales?: string | readonly string[], options?: Intl.PluralRulesOptions) {
      this.language = languageOf(locales);
      this.locale = (Array.isArray(locales) ? locales[0] : (locales as string | undefined)) ?? 'en';
      if (!RULES[this.language]) {
        if (!native) throw new RangeError(`Incorrect locale information provided: ${this.locale}`);
        this.fallback = new native(locales as string | string[], options);
      }
    }

    select(n: number): PluralCategory {
      return this.fallback ? (this.fallback.select(n) as PluralCategory) : pluralCategory(this.language, n);
    }

    resolvedOptions() {
      if (this.fallback) return this.fallback.resolvedOptions();
      return { locale: this.locale, type: 'cardinal' as const, pluralCategories: [...RULES[this.language].categories] };
    }

    static supportedLocalesOf(locales: string | readonly string[]) {
      return (Array.isArray(locales) ? locales : [locales as string]).filter((l) => RULES[languageOf(l)]);
    }
  };
}

/** call once, before i18next resolves a plural; a no-op where the engine's own rules are right */
export function installPluralRules() {
  if (typeof Intl !== 'undefined' && engineIsTrustworthy()) return;
  const host = (typeof Intl === 'undefined' ? ((globalThis as { Intl?: object }).Intl = {}) : Intl) as { PluralRules?: unknown };
  host.PluralRules = makeShim(host.PluralRules as typeof Intl.PluralRules | undefined);
}
