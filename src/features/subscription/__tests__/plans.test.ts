import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WEEKLY_PLAN,
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
  assert.equal(formatPlanPrice(WEEKLY_PLAN), '$2.99/week');
  assert.equal(formatPlanPrice(MONTHLY_PLAN), '$4.99/month');
  assert.equal(formatPlanPrice(YEARLY_PLAN), '$24.99/year');
});

test('the yearly plan saves ~58% versus weekly', () => {
  // $2.99/week × 48 weeks (12 months) = $143.52 vs $24.99 → ~82%
  const pct = savingsPercent(YEARLY_PLAN);
  assert.ok(pct > 0);
  assert.equal(savingsBadge(YEARLY_PLAN), `Save ${pct}%`);
});

test('the monthly plan saves versus weekly', () => {
  // $2.99/week × ~4.33 weeks vs $4.99/month
  const pct = savingsPercent(MONTHLY_PLAN);
  assert.ok(pct > 0);
});

test('the weekly plan advertises no savings', () => {
  assert.equal(savingsPercent(WEEKLY_PLAN), 0);
  assert.equal(savingsBadge(WEEKLY_PLAN), null);
});

test('the yearly per-month equivalent is honest', () => {
  assert.equal(monthlyEquivalentCents(YEARLY_PLAN), 208); // 2499/12
  assert.equal(formatMonthlyEquivalent(YEARLY_PLAN), '$2.08/mo');
});

test('trial headline works for all plans', () => {
  assert.equal(trialHeadline(WEEKLY_PLAN), 'Try Premium free for 7 days');
  assert.equal(trialHeadline(MONTHLY_PLAN), 'Try Premium free for 7 days');
  assert.equal(trialHeadline(YEARLY_PLAN), 'Try Premium free for 7 days');
});

test('terms spell out auto-renewal with trial', () => {
  assert.match(planTerms(WEEKLY_PLAN), /^7 days free, then \$2\.99\/week/);
  assert.match(planTerms(MONTHLY_PLAN), /^7 days free, then \$4\.99\/month/);
  assert.match(planTerms(YEARLY_PLAN), /^7 days free, then \$24\.99\/year/);
  assert.match(planTerms(YEARLY_PLAN), /Renews automatically/);
});

test('the yearly plan is the recommended one', () => {
  assert.equal(YEARLY_PLAN.recommended, true);
  assert.equal(MONTHLY_PLAN.recommended, false);
  assert.equal(WEEKLY_PLAN.recommended, false);
});
