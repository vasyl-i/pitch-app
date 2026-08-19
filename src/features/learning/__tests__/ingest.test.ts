import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingestSession } from '../lib/ingest';
import { makeSkills } from './helpers';

const T0 = 1_700_000_000_000;

const melodyFacts = {
  exerciseId: 'twinkle',
  at: T0,
  score: 82,
  stability: 91,
  rhythm: 74,
  avgCents: 12,
  durationSec: 20,
};

test('a staff-practice session trains stability from the stability metric, not the score', () => {
  const { skills, annotation } = ingestSession(makeSkills(), {}, melodyFacts, null);
  assert.equal(annotation.skills['pitch-stability']?.value, 91);
  assert.equal(annotation.skills['rhythm-accuracy']?.value, 74);
  assert.equal(annotation.skills['pitch-accuracy']?.value, 82);
  assert.ok(skills['pitch-stability'].mastery > skills['rhythm-accuracy'].mastery);
});

test('an ear-training session maps through its ear: exercise id', () => {
  const facts = { exerciseId: 'ear:sing-interval', at: T0, score: 65, stability: 65, rhythm: 65, avgCents: 30 };
  const { skills, annotation, reviews } = ingestSession(makeSkills(), {}, facts, 'interval-singing');
  assert.ok(annotation.skills['interval-singing']);
  assert.ok(annotation.skills['interval-recognition']);
  assert.equal(annotation.weeklyFocus, 'interval-singing');
  assert.ok(skills['interval-singing'].exercisesCompleted === 1);
  assert.ok(reviews['interval-singing'], 'practicing a skill schedules its next review');
});

test('mistake tags fire on weak metrics', () => {
  const facts = { exerciseId: 'twinkle', at: T0, score: 48, stability: 60, rhythm: 60, avgCents: 32, durationSec: 20 };
  const { annotation } = ingestSession(makeSkills(), {}, facts, null);
  assert.deepEqual(annotation.mistakes, ['intonation', 'stability', 'rhythm', 'accuracy']);
});

test('an unknown future ear drill still feeds the profile via the generic mapping', () => {
  const facts = { exerciseId: 'ear:brand-new-drill', at: T0, score: 70, stability: 70, rhythm: 70, avgCents: 10 };
  const { annotation } = ingestSession(makeSkills(), {}, facts, null);
  assert.ok(Object.keys(annotation.skills).length > 0);
});

test('ingest is deterministic', () => {
  const a = ingestSession(makeSkills(), {}, melodyFacts, null);
  const b = ingestSession(makeSkills(), {}, melodyFacts, null);
  assert.deepEqual(a, b);
});
