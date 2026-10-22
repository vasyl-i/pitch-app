import type { ParseKeys } from 'i18next';
import { i18n } from './i18n';

/**
 * Domain content (exercise library, skill tree, journey areas, …) keeps its
 * English text inline as the source of truth. Translations live in the
 * `content` namespace keyed `<group>.<id>.<field>`; this swaps the listed
 * fields for getters that read the current language and fall back to the
 * original English text.
 *
 * Mutates and returns the items so module-level constants keep their identity.
 */
export function localizeContent<T extends object>(
  group: string,
  items: T[],
  idOf: (item: T) => string,
  fields: readonly (keyof T & string)[],
): T[] {
  for (const item of items) {
    const id = idOf(item);
    for (const field of fields) {
      const english = item[field];
      if (typeof english !== 'string') continue;
      Object.defineProperty(item, field, {
        enumerable: true,
        configurable: true,
        get: () => contentText(group, id, field, english),
      });
    }
  }
  return items;
}

/** Same as `localizeContent` for a `Record<id, string>` lookup table. */
export function localizeRecord<K extends string>(group: string, record: Record<K, string>): Record<K, string> {
  for (const id of Object.keys(record) as K[]) {
    const english = record[id];
    Object.defineProperty(record, id, {
      enumerable: true,
      configurable: true,
      get: () => contentText(group, id, 'label', english),
    });
  }
  return record;
}

export function contentText(group: string, id: string, field: string, english: string): string {
  // content keys are dynamic (ids from data), so they sit outside the typed catalog
  const untypedT = i18n.t as unknown as (key: string, options: object) => string;
  return untypedT(`${group}.${id}.${field}`, { ns: 'content', defaultValue: english });
}

/**
 * A lookup table whose values are translation keys, read lazily so module-level
 * constants (e.g. `SKILL_LABELS[id]`) always return the current language.
 */
export function translatedRecord<K extends string>(keys: Record<K, ParseKeys>): Record<K, string> {
  const record = {} as Record<K, string>;
  for (const id of Object.keys(keys) as K[]) {
    Object.defineProperty(record, id, { enumerable: true, get: () => i18n.t(keys[id]) });
  }
  return record;
}
