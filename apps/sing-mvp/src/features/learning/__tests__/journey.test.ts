import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildJourney, buildJourneyArea, MILESTONE_DONE_MASTERY } from '../lib/journey';
import { SKILL_TREE, SKILL_TREE_CATEGORIES } from '../lib/skillTree';
import { makeSkills, trained } from './helpers';

test('a fresh profile has every area present, nothing done, exactly one current milestone where unlocked', () => {
  const journey = buildJourney(makeSkills());
  assert.equal(journey.length, SKILL_TREE_CATEGORIES.length);
  for (const area of journey) {
    assert.equal(area.doneCount, 0);
    assert.equal(area.started, false);
    const current = area.milestones.filter((m) => m.state === 'current');
    assert.ok(current.length <= 1, `${area.category} has ${current.length} current milestones`);
    if (area.milestones.some((m) => m.state !== 'locked')) {
      assert.equal(current.length, 1, `${area.category} should point at exactly one next milestone`);
    }
  }
});

test('milestones complete at the mastery threshold and unlock downstream nodes', () => {
  const skills = makeSkills({ 'pitch-accuracy': trained(90, 30) });
  assert.ok(skills['pitch-accuracy'].mastery >= MILESTONE_DONE_MASTERY, 'setup: trained state clears the bar');
  const area = buildJourneyArea('pitch', skills);

  const echo = area.milestones.find((m) => m.node.id === 'pitch-1');
  assert.equal(echo?.state, 'done');
  const scale = area.milestones.find((m) => m.node.id === 'pitch-2');
  assert.equal(scale?.state, 'done', 'unlocked (requires pitch-accuracy 35) and mastery is past the bar');
  // pitch-3 trains pitch-memory (untrained) but unlocked by pitch-accuracy 45
  const memory = area.milestones.find((m) => m.node.id === 'pitch-3');
  assert.equal(memory?.state, 'current');

  assert.equal(area.started, true);
  assert.equal(area.doneCount, 2);
});

test('locked milestones carry a friendly hint with no numbers', () => {
  const journey = buildJourney(makeSkills());
  const locked = journey.flatMap((a) => a.milestones).filter((m) => m.state === 'locked');
  assert.ok(locked.length > 0, 'a fresh profile must have locked milestones');
  for (const m of locked) {
    assert.ok(m.lockedHint && m.lockedHint.length > 0);
    assert.ok(!/\d/.test(m.lockedHint!), `hint should be plain language, got "${m.lockedHint}"`);
  }
});

test('area mastery averages the distinct primary skills of the area', () => {
  const skills = makeSkills();
  const area = buildJourneyArea('pitch', skills);
  const distinct = [...new Set(SKILL_TREE.filter((n) => n.category === 'pitch').map((n) => n.primarySkill))];
  const expected = Math.round(distinct.reduce((sum, s) => sum + skills[s].mastery, 0) / distinct.length);
  assert.equal(area.mastery, expected);
});
