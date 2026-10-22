/**
 * Shape every non-English catalog must satisfy: the exact key tree of the
 * English catalog (so a missing or stale key is a compile error), plus the
 * extra CLDR plural forms for every `<key>_other` pluralised key.
 *
 * `Extra` is the forms the language adds beyond English's `one` / `other`:
 * Ukrainian `few` / `many` (the default), European Portuguese `many`.
 */
type PluralBase<K> = K extends `${infer B}_other` ? B : never;

export type LocaleShape<T, Extra extends string = 'few' | 'many'> = {
  [K in keyof T]: T[K] extends string ? string : LocaleShape<T[K], Extra>;
} & {
  [K in PluralBase<keyof T> as `${K}_${Extra}`]: string;
};

/** Portuguese catalog shape: CLDR `pt-PT` adds `many` (millions) to `one` / `other`. */
export type PtLocaleShape<T> = LocaleShape<T, 'many'>;

/** Overlay for domain content keyed by stable id (see `content.ts`). */
export type ContentOverlay = Record<string, Record<string, Record<string, string>>>;
