import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeliveryLag } from '../lib/deliveryLag';

test('measures how late a frame arrived beyond the usual pipeline delay', () => {
  const d = createDeliveryLag();
  // captured every 12 ms, delivered 20 ms later as a rule
  assert.equal(d.lagMs(0, 1_000_020), 0);
  assert.equal(d.lagMs(0.012, 1_000_032), 0);
  // the JS thread stalls: three frames arrive together, 60/48/36 ms late
  assert.equal(d.lagMs(0.024, 1_000_104), 60);
  assert.equal(d.lagMs(0.036, 1_000_104), 48);
  assert.equal(d.lagMs(0.048, 1_000_104), 36);
  // a faster delivery than any seen lowers the baseline
  assert.equal(d.lagMs(0.06, 1_000_075), 0);
  assert.equal(d.lagMs(0.072, 1_000_090), 3);
});

test('starts over on a new recording, and without capture times', () => {
  const d = createDeliveryLag();
  assert.equal(d.lagMs(undefined, 5_000), 0);
  d.lagMs(10, 1_010_020);
  // the recorder restarted: `when` is back near zero
  assert.equal(d.lagMs(0.012, 1_020_000), 0);
  assert.equal(d.lagMs(0.024, 1_020_030), 18);
  d.reset();
  assert.equal(d.lagMs(0.036, 1_020_100), 0);
});
