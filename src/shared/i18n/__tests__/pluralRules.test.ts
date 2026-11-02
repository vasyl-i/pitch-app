import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installPluralRules, pluralCategory } from '../pluralRules';

// the pinned rules must agree with the engine's CLDR data wherever the engine has it
for (const [language, locale] of [['en', 'en'], ['uk', 'uk'], ['pt', 'pt-PT']] as const) {
  test(`${language}: pluralCategory matches Intl.PluralRules for 0–2000 and whole millions`, () => {
    const real = new Intl.PluralRules(locale);
    for (const n of [...Array.from({ length: 2001 }, (_, i) => i), 1_000_000, 2_000_000, 1_500_000]) {
      assert.equal(pluralCategory(language, n), real.select(n), `${language} ${n}`);
    }
  });
}

test('Ukrainian counts: 1 one, 2–4 few, 5–20 many, 21 one, 22 few, 25 many', () => {
  const got = [1, 2, 3, 4, 5, 11, 12, 14, 20, 21, 22, 25].map((n) => pluralCategory('uk', n));
  assert.deepEqual(got, ['one', 'few', 'few', 'few', 'many', 'many', 'many', 'many', 'many', 'one', 'few', 'many']);
});

test('European Portuguese: 0 is plural, 1 is singular', () => {
  assert.equal(pluralCategory('pt', 0), 'other');
  assert.equal(pluralCategory('pt', 1), 'one');
});

test('installPluralRules replaces an engine whose rules are wrong, and leaves a correct one alone', () => {
  const real = Intl.PluralRules;
  try {
    installPluralRules();
    assert.equal(Intl.PluralRules, real, 'a trustworthy engine is untouched');

    // an engine that only knows "one" vs "other", like i18next's dummy rule
    (Intl as { PluralRules: unknown }).PluralRules = class {
      select(n: number) { return n === 1 ? 'one' : 'other'; }
      resolvedOptions() { return { pluralCategories: ['one', 'other'] }; }
    };
    installPluralRules();
    const uk = new Intl.PluralRules('uk');
    assert.deepEqual([1, 3, 5, 21, 22].map((n) => uk.select(n)), ['one', 'few', 'many', 'one', 'few']);
    assert.deepEqual(uk.resolvedOptions().pluralCategories, ['few', 'many', 'one', 'other']);
    assert.equal(new Intl.PluralRules('pt-PT').select(0), 'other');
  } finally {
    (Intl as { PluralRules: unknown }).PluralRules = real;
  }
});
