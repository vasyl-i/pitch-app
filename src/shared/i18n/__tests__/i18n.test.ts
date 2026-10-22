import assert from 'node:assert/strict';
import test from 'node:test';
import { changeLanguage, i18n, resolveLanguage } from '../i18n';
import { en } from '../locales/en';
import { uk, ukContent } from '../locales/uk';
import { pt, ptContent } from '../locales/pt';
import type { ContentOverlay } from '../types';
import { exercises, isSong } from '../../../entities/exercise/library';
import { EXERCISE_CATEGORIES } from '../../../entities/exercise/categories';
import { CATALOG } from '../../../features/learning/lib/catalog';
import { SKILL_TREE } from '../../../features/learning/lib/skillTree';
import { PREMIUM_BENEFITS } from '../../../features/subscription/model/benefits';
import { MONTHLY_PLAN, WEEKLY_PLAN, YEARLY_PLAN } from '../../../features/subscription/model/plans';

type Tree = { [key: string]: string | Tree };

/** flatten to dotted keys, folding CLDR plural suffixes onto their base key */
function leaves(tree: Tree, prefix = ''): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      const base = path.replace(/_(zero|one|two|few|many|other)$/, '');
      out.set(base, [...(out.get(base) ?? []), value]);
    } else {
      for (const [k, v] of leaves(value, path)) out.set(k, [...(out.get(k) ?? []), ...v]);
    }
  }
  return out;
}

const placeholders = (values: string[]) =>
  [...new Set(values.flatMap((v) => [...v.matchAll(/\{\{(\w+)(?:,[^}]*)?\}\}/g)].map((m) => m[1])))].sort();

const CATALOGS: [string, Tree, ContentOverlay][] = [
  ['uk', uk as unknown as Tree, ukContent],
  ['pt', pt as unknown as Tree, ptContent],
];

test('phone language decides: Ukrainian for uk, Portuguese for pt, English for everything else', () => {
  assert.equal(resolveLanguage('uk'), 'uk');
  assert.equal(resolveLanguage('UK'), 'uk');
  assert.equal(resolveLanguage('pt'), 'pt');
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('pl'), 'en');
  assert.equal(resolveLanguage('ru'), 'en');
  assert.equal(resolveLanguage(null), 'en');
  assert.equal(resolveLanguage(undefined), 'en');
});

for (const [lang, catalog] of CATALOGS) {
  test(`${lang} catalog has every English key with the same placeholders`, () => {
    const enLeaves = leaves(en as unknown as Tree);
    const langLeaves = leaves(catalog);
    for (const [key, values] of enLeaves) {
      const langValues = langLeaves.get(key);
      assert.ok(langValues, `missing ${lang} key: ${key}`);
      // `count` may be implied by the plural form rather than printed
      const expected = placeholders(values).filter((p) => p !== 'count');
      const actual = placeholders(langValues).filter((p) => p !== 'count');
      assert.deepEqual(actual, expected, `placeholder mismatch in ${lang} ${key}`);
    }
    for (const key of langLeaves.keys()) assert.ok(enLeaves.has(key), `stale ${lang} key: ${key}`);
  });
}

test('Portuguese copy avoids ª / º — Satoshi has no glyphs for them', () => {
  const strings = [...leaves(pt as unknown as Tree).values()].flat();
  const content = Object.values(ptContent).flatMap((g) => Object.values(g).flatMap((f) => Object.values(f)));
  for (const s of [...strings, ...content]) assert.ok(!/[ªº]/.test(s), `ª/º in pt copy: ${s}`);
});

test('every piece of domain content has a translated overlay', () => {
  const groups: [string, { id: string; fields: string[] }[]][] = [
    ['exercise', exercises.map((e) => ({
      id: e.id,
      fields: [...(isSong(e) ? [] : ['title']), 'source', ...(e.hint ? ['hint'] : [])],
    }))],
    ['exerciseCategory', EXERCISE_CATEGORIES.map((c) => ({ id: c.id, fields: ['label', 'tagline'] }))],
    ['skillTree', SKILL_TREE.map((n) => ({ id: n.id, fields: ['title'] }))],
    ['earExercise', CATALOG.filter((a) => a.kind === 'ear').map((a) => ({ id: a.id, fields: ['title', 'tagline'] }))],
    ['premiumBenefit', PREMIUM_BENEFITS.map((b) => ({ id: b.feature, fields: ['title', 'detail'] }))],
    ['plan', [WEEKLY_PLAN, MONTHLY_PLAN, YEARLY_PLAN].map((p) => ({ id: p.id, fields: ['name'] }))],
  ];
  for (const [lang, , overlay] of CATALOGS) {
    for (const [group, items] of groups) {
      for (const { id, fields } of items) {
        for (const field of fields) {
          assert.ok(overlay[group]?.[id]?.[field], `missing ${lang} content: ${group}.${id}.${field}`);
        }
      }
    }
  }
});

test('song titles are never translated', () => {
  for (const [lang, , overlay] of CATALOGS) {
    for (const song of exercises.filter(isSong)) {
      assert.equal(overlay.exercise?.[song.id]?.title, undefined, `${lang} song title translated: ${song.id}`);
    }
  }
});

test('the lowercase formatter keeps English mid-sentence labels lower-case', () => {
  assert.equal(
    i18n.t('learning.coach.improving', { skill: 'Pitch accuracy' }),
    "You're becoming noticeably more consistent in pitch accuracy."
  );
});

test('content and plurals follow the active language', async () => {
  try {
    assert.equal(exercises.find((e) => e.id === 'c-major-scale')?.title, 'C major scale');
    await i18n.changeLanguage('uk');
    assert.equal(exercises.find((e) => e.id === 'c-major-scale')?.title, 'Гама до мажор');
    assert.equal(exercises.find((e) => e.id === 'twinkle')?.title, 'Twinkle, Twinkle, Little Star');
    assert.equal(CATALOG.find((a) => a.id === 'twinkle')?.title, 'Twinkle, Twinkle, Little Star');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 1 }), '1 вправа');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 3 }), '3 вправи');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 5 }), '5 вправ');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 21 }), '21 вправа');

    await changeLanguage('pt');
    assert.equal(exercises.find((e) => e.id === 'c-major-scale')?.title, 'Escala de Dó maior');
    assert.equal(exercises.find((e) => e.id === 'twinkle')?.title, 'Twinkle, Twinkle, Little Star');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 1 }), '1 exercício');
    // European Portuguese: zero is plural (Brazilian `pt` rules would say "0 exercício")
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 0 }), '0 exercícios');
    assert.equal(i18n.t('profile.weekly.exerciseCount', { count: 5 }), '5 exercícios');
  } finally {
    await i18n.changeLanguage('en');
  }
});
