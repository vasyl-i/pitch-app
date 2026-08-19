/**
 * How the two attempts are framed against each other. The numbers come from
 * the scoring engine; what is at stake here is that a drop — which is the
 * normal, expected result of removing the guide — never reads as failure.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareAttempts } from '../comparison';
import type { PhraseSummary } from '../evaluation';

const summary = (score: number): PhraseSummary => ({
  avgCents: 0,
  stability: 0,
  rhythm: 0,
  longestStableSec: 0,
  score,
  results: [],
});

describe('comparing the assisted and unaided attempts', () => {
  it('reports both scores and a signed difference', () => {
    const c = compareAttempts(summary(92), summary(84));
    assert.equal(c.accompaniedScore, 92);
    assert.equal(c.soloScore, 84);
    assert.equal(c.delta, -8);
  });

  it('celebrates an unaided attempt that beat the guided one', () => {
    const c = compareAttempts(summary(80), summary(88));
    assert.equal(c.trend, 'improved');
    assert.match(c.message, /even better without the guide/);
  });

  it('treats an equal score as improvement, not a hold', () => {
    assert.equal(compareAttempts(summary(80), summary(80)).trend, 'improved');
  });

  it('calls a small drop almost-ready rather than a regression', () => {
    const c = compareAttempts(summary(92), summary(85));
    assert.equal(c.trend, 'held');
    assert.match(c.message, /almost ready/);
  });

  it('sends a large drop back to the accompaniment, encouragingly', () => {
    const c = compareAttempts(summary(92), summary(60));
    assert.equal(c.trend, 'slipped');
    assert.match(c.message, /Practice with the accompaniment/);
    assert.doesNotMatch(c.message, /fail|worse|poor/i, 'the copy must not read as failure');
  });

  it('puts the boundary between held and slipped at 8 points', () => {
    assert.equal(compareAttempts(summary(90), summary(82)).trend, 'held');
    assert.equal(compareAttempts(summary(90), summary(81)).trend, 'slipped');
  });
});
