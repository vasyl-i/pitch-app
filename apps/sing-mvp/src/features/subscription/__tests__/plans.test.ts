import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MONTHLY_PLAN,
  YEARLY_PLAN,
  formatMonthlyEquivalent,
  formatPlanPrice,
  monthlyEquivalentCents,
  planTerms,
  savingsBadge,
  savingsPercent,
  trialHeadline,
} from '../model/plans';

test('prices render as the spec states', () => {
  assert.equal(formatPlanPrice(MONTHLY_PLAN), '$4.99/month');
  assert.equal(formatPlanPrice(YEARLY_PLAN), '$49.99/year');
});

test('the yearly plan saves ~17% versus monthly, floored', () => {
  // $49.99 vs 12 × $4.99 = $59.88 → 16.5%, floored to 16
  assert.equal(savingsPercent(YEARLY_PLAN), 16);
  assert.ok(savingsPercent(YEARLY_PLAN) >= 15 && savingsPercent(YEARLY_PLAN) <= 17);
  assert.equal(savingsBadge(YEARLY_PLAN), 'Save 16%');
});

test('the monthly plan advertises no savings', () => {
  assert.equal(savingsPercent(MONTHLY_PLAN), 0);
  assert.equal(savingsBadge(MONTHLY_PLAN), null);
});

test('the yearly per-month equivalent is honest', () => {
  assert.equal(monthlyEquivalentCents(YEARLY_PLAN), 417); // 4999/12
  assert.equal(formatMonthlyEquivalent(YEARLY_PLAN), '$4.17/mo');
});

test('only the yearly plan offers a trial headline', () => {
  assert.equal(trialHeadline(YEARLY_PLAN), 'Try Premium free for 7 days');
  assert.equal(trialHeadline(MONTHLY_PLAN), null);
});

test('terms spell out auto-renewal, with the trial only where it applies', () => {
  assert.match(planTerms(YEARLY_PLAN), /^7 days free, then \$49\.99\/year/);
  assert.match(planTerms(YEARLY_PLAN), /Renews automatically/);
  assert.match(planTerms(MONTHLY_PLAN), /^\$4\.99\/month\. Renews automatically/);
  assert.doesNotMatch(planTerms(MONTHLY_PLAN), /free/);
});

test('the yearly plan is the recommended one', () => {
  assert.equal(YEARLY_PLAN.recommended, true);
  assert.equal(MONTHLY_PLAN.recommended, false);
});
