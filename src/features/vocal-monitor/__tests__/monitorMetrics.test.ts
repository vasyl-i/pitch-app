import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracyScore, centsFromNearestNote, createRollingMean, stabilityLevel, stabilityScore } from '../lib/monitorMetrics';

test('cents are measured from the nearest semitone, signed', () => {
  assert.equal(Math.round(centsFromNearestNote(60)), 0);
  assert.equal(Math.round(centsFromNearestNote(60.2)), 20);
  assert.equal(Math.round(centsFromNearestNote(59.7)), -30);
  assert.equal(Math.round(centsFromNearestNote(60.5 + 0.01)), -49);
});

test('accuracy: full within 20 cents, zero a quarter-tone off', () => {
  assert.equal(accuracyScore(0), 100);
  assert.equal(accuracyScore(-20), 100);
  assert.equal(accuracyScore(35), 50);
  assert.equal(accuracyScore(50), 0);
  assert.ok(accuracyScore(30) > 0 && accuracyScore(30) < 100);
  assert.ok(accuracyScore(25) > accuracyScore(40));
});

test('stability: steady under 8 cents of wobble, none left at 40', () => {
  assert.equal(stabilityScore(5), 100);
  assert.equal(stabilityScore(40), 0);
  assert.equal(stabilityLevel(stabilityScore(5)), 'steady');
  assert.equal(stabilityLevel(stabilityScore(25)), 'wobbly');
  assert.equal(stabilityLevel(stabilityScore(38)), 'unsteady');
});

test('rolling mean forgets values older than its window', () => {
  const m = createRollingMean(1000);
  assert.equal(m.mean(0), null);
  m.push(100, 0);
  m.push(50, 500);
  assert.equal(m.mean(600), 75);
  assert.equal(m.mean(1200), 50);
  assert.equal(m.mean(2000), null);
});
