import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWeeklyReview, chooseWeeklyFocus, weekKeyOf } from '../lib/weekly';
import { DEFAULT_PREFERENCES } from '../model/preferencesStore';
import type { SkillId } from '../model/types';
import { makeSkills, trained } from './helpers';

const prefs = { ...DEFAULT_PREFERENCES, updatedAt: 0 };

test('week keys are stable within a week and change across weeks', () => {
  const wed = new Date(2026, 6, 15, 12).getTime(); // Wed Jul 15 2026
  const fri = new Date(2026, 6, 17, 9).getTime();
  const nextMon = new Date(2026, 6, 20, 9).getTime();
  assert.equal(weekKeyOf(wed), weekKeyOf(fri));
  assert.notEqual(weekKeyOf(fri), weekKeyOf(nextMon));
});

test('weekly focus is deterministic and goal-aligned', () => {
  const skills = makeSkills({ 'pitch-stability': { mastery: 20 } });
  const a = chooseWeeklyFocus(skills, prefs, '2026-6-13', null);
  const b = chooseWeeklyFocus(skills, prefs, '2026-6-13', null);
  assert.equal(a, b);
  // sing-in-tune goal aligns to pitch/interval skills
  assert.ok(['pitch-accuracy', 'pitch-stability', 'interval-singing'].includes(a));
});

test('the focus rotates: last week’s focus is avoided when alternatives exist', () => {
  const skills = makeSkills();
  const prev = chooseWeeklyFocus(skills, prefs, '2026-6-6', null);
  const next = chooseWeeklyFocus(skills, prefs, '2026-6-13', prev);
  assert.notEqual(next, prev);
});

test('the weekly review reports the strongest improvement and weakest skill', () => {
  const skills = makeSkills({
    'pitch-accuracy': { ...trained(75, 12) },
    'chord-recognition': { ...trained(40, 4) },
  });
  const start = Object.fromEntries(Object.keys(skills).map((k) => [k, 30])) as Record<SkillId, number>;

  const report = buildWeeklyReview({
    weekKey: '2026-6-13',
    focus: 'pitch-accuracy',
    skills,
    startOfWeekMastery: start,
    annotations: [],
    daysPracticed: 4,
    sessions: 9,
    practiceSeconds: 1800,
    streak: 4,
    prefs,
  });

  assert.equal(report.strongestImprovement?.skill, 'pitch-accuracy');
  assert.equal(report.weakestSkill, 'chord-recognition');
  assert.ok(report.masteryChanges.length >= 2);
  assert.ok(report.summary.length >= 3, 'the report explains itself in plain language');
  assert.ok(report.recommendedFocus);
});
