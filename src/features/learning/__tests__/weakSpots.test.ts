import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG } from '../lib/catalog';
import {
  aggregateHistory,
  findWeakSpots,
  intervalName,
  midiName,
  type SessionLike,
  type Tally,
  type WeakSpotInput,
} from '../lib/weakSpots';
import { emptySkillState } from '../lib/mastery';
import { ALL_SKILLS, type SkillId, type SkillState } from '../model/types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function skills(overrides: Partial<Record<SkillId, Partial<SkillState>>> = {}): Record<SkillId, SkillState> {
  return Object.fromEntries(
    ALL_SKILLS.map((s) => [s, { ...emptySkillState(), ...overrides[s] }])
  ) as Record<SkillId, SkillState>;
}

const tally = (count: number, perfect: number, centsEach: number): Tally => ({
  count,
  perfect,
  centsSum: centsEach * count,
});

function input(over: Partial<WeakSpotInput> = {}): WeakSpotInput {
  return {
    skills: skills(),
    byMidi: {},
    byInterval: {},
    byPitchClass: {},
    avgStability: null,
    avgRhythm: null,
    catalog: CATALOG,
    ...over,
  };
}

test('names a descending minor third weakness from a flat interval tendency', () => {
  const spots = findWeakSpots(input({ byInterval: { '-3': tally(14, 2, -31) } }));
  const interval = spots.find((s) => s.kind === 'interval');
  assert.ok(interval, 'expected an interval weak spot');
  assert.match(interval!.title, /Descending minor 3rds/);
  assert.match(interval!.evidence, /31¢ flat/);
  assert.match(interval!.evidence, /14 attempts/);
  assert.ok(interval!.activity, 'a weak spot should carry a drill');
});

test('does not manufacture a weak spot from too little data', () => {
  const spots = findWeakSpots(input({ byInterval: { '-3': tally(3, 0, -40) } }));
  assert.equal(spots.length, 0);
});

test('a clean, in-tune interval is not a weak spot', () => {
  const spots = findWeakSpots(input({ byInterval: { '+4': tally(20, 18, 3) } }));
  assert.equal(spots.filter((s) => s.kind === 'interval').length, 0);
});

test('detects a high-register break where accuracy falls off', () => {
  // clean below G4 (67), poor above it
  const byMidi: Record<number, Tally> = {
    60: tally(10, 9, 4),
    62: tally(10, 9, 3),
    64: tally(10, 8, 5),
    69: tally(10, 2, 28),
    71: tally(10, 1, 33),
    72: tally(10, 1, 35),
  };
  const spots = findWeakSpots(input({ byMidi }));
  const register = spots.find((s) => s.kind === 'register');
  assert.ok(register, 'expected a register weak spot');
  assert.match(register!.title, /High register/);
  assert.match(register!.evidence, /drops/);
});

test('surfaces a relative skill gap as a fallback when fine signals are thin', () => {
  const spots = findWeakSpots(
    input({
      skills: skills({
        'pitch-accuracy': { mastery: 75, exercisesCompleted: 20 },
        'rhythm-accuracy': { mastery: 45, exercisesCompleted: 20 },
        'pitch-stability': { mastery: 78, exercisesCompleted: 20 },
      }),
    })
  );
  const gap = spots.find((s) => s.kind === 'skill');
  assert.ok(gap, 'expected a skill-gap weak spot');
  assert.equal(gap!.skill, 'rhythm-accuracy');
});

test('ranks stronger evidence first', () => {
  const spots = findWeakSpots(
    input({
      byInterval: {
        '-1': tally(30, 1, -45), // severe
        '+2': tally(8, 4, -22), // mild
      },
    })
  );
  assert.ok(spots.length >= 2);
  assert.ok(spots[0].severity >= spots[1].severity);
});

test('aggregateHistory ignores sessions outside the window', () => {
  const recent: SessionLike = {
    at: T0,
    stability: 60,
    rhythm: 80,
    notes: {},
    notesByMidi: { 67: tally(5, 1, 30) },
    intervals: { '-3': tally(5, 1, -25) },
  };
  const old: SessionLike = {
    at: T0 - 200 * DAY,
    stability: 90,
    rhythm: 90,
    notes: {},
    notesByMidi: { 67: tally(50, 50, 0) },
    intervals: { '-3': tally(50, 50, 0) },
  };
  const agg = aggregateHistory([recent, old], T0);
  assert.equal(agg.byMidi[67].count, 5); // old session excluded
  assert.equal(agg.byInterval['-3'].count, 5);
  assert.equal(agg.avgStability, 60);
});

test('interval and note names read naturally', () => {
  assert.equal(intervalName('-3'), 'Descending minor 3rds');
  assert.equal(intervalName('+7'), 'Ascending perfect 5ths');
  assert.equal(midiName(67), 'G4');
  assert.equal(midiName(60), 'C4');
});
