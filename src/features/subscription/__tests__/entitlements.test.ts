import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  effectiveStatus,
  isPremium,
  isTrialEligible,
  resolveEntitlements,
  trialDaysRemaining,
} from '../lib/entitlements';
import { subscriptionFromPurchase } from '../lib/billing';
import { freeSubscription, type SubscriptionState } from '../model/types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

test('a free user unlocks nothing gated', () => {
  const ent = resolveEntitlements(freeSubscription());
  assert.equal(ent['adaptive-lessons'], false);
  assert.equal(ent['weak-spot-training'], false);
  assert.equal(ent['advanced-library'], false);
  assert.equal(ent['unlimited-instrumental-uploads'], false);
  assert.equal(ent['future-weekly-report'], false);
});

test('an active subscriber unlocks every feature', () => {
  const sub = subscriptionFromPurchase('monthly', { now: T0, trialEligible: false });
  const ent = resolveEntitlements(sub, T0 + DAY);
  assert.ok(Object.values(ent).every(Boolean));
});

test('a trialing user has full access', () => {
  const sub = subscriptionFromPurchase('yearly', { now: T0, trialEligible: true });
  assert.equal(sub.status, 'trialing');
  assert.equal(isPremium(sub, T0 + DAY), true);
  assert.equal(resolveEntitlements(sub, T0 + DAY)['ai-session-feedback'], true);
});

test('a yearly purchase grants a 7-day trial that converts to paid', () => {
  const sub = subscriptionFromPurchase('yearly', { now: T0, trialEligible: true });
  assert.equal(trialDaysRemaining(sub, T0), 7);
  assert.equal(trialDaysRemaining(sub, T0 + 3 * DAY), 4);
  // during the trial
  assert.equal(effectiveStatus(sub, T0 + 3 * DAY), 'trialing');
  // after the trial, auto-renew on → active
  assert.equal(effectiveStatus(sub, T0 + 8 * DAY), 'active');
  assert.equal(isPremium(sub, T0 + 8 * DAY), true);
});

test('a monthly purchase has no trial', () => {
  const sub = subscriptionFromPurchase('monthly', { now: T0, trialEligible: true });
  assert.equal(sub.status, 'active');
  assert.equal(sub.trialEndsAt, null);
  assert.equal(trialDaysRemaining(sub, T0), null);
});

test('trial eligibility is spent by the first purchase', () => {
  assert.equal(isTrialEligible(freeSubscription()), true);
  const sub = subscriptionFromPurchase('yearly', { now: T0, trialEligible: true });
  assert.equal(isTrialEligible(sub), false);
  // a second yearly purchase, no longer eligible, gets no trial
  const second = subscriptionFromPurchase('yearly', { now: T0 + 400 * DAY, trialEligible: isTrialEligible(sub) });
  assert.equal(second.status, 'active');
  assert.equal(second.trialEndsAt, null);
});

test('a lapsed period expires locally even if the store never told us', () => {
  const sub: SubscriptionState = {
    ...subscriptionFromPurchase('monthly', { now: T0, trialEligible: false }),
    willRenew: false,
  };
  // still inside the paid month
  assert.equal(isPremium(sub, T0 + 10 * DAY), true);
  // past the period end with renewal off
  assert.equal(effectiveStatus(sub, T0 + 40 * DAY), 'expired');
  assert.equal(isPremium(sub, T0 + 40 * DAY), false);
});

test('a cancelled trial with renewal off expires at trial end', () => {
  const sub: SubscriptionState = {
    ...subscriptionFromPurchase('yearly', { now: T0, trialEligible: true }),
    willRenew: false,
  };
  assert.equal(effectiveStatus(sub, T0 + 3 * DAY), 'trialing');
  assert.equal(effectiveStatus(sub, T0 + 8 * DAY), 'expired');
});

test('grace keeps access on through a failed renewal', () => {
  const sub: SubscriptionState = {
    ...subscriptionFromPurchase('monthly', { now: T0, trialEligible: false }),
    status: 'grace',
  };
  assert.equal(isPremium(sub, T0 + 40 * DAY), true);
});
