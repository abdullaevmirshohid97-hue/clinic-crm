/**
 * SubscriptionService static utility method tests.
 * These are pure functions with no external dependencies — no Supabase needed.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { SubscriptionService } from '../../src/services/subscriptionService';

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();        // yesterday

describe('SubscriptionService.isExpired()', () => {
  test('returns true when sub is null', () => {
    assert.equal(SubscriptionService.isExpired(null), true);
  });

  test('returns true when sub has no current_period_end', () => {
    assert.equal(SubscriptionService.isExpired({}), true);
  });

  test('returns true when status is "expired"', () => {
    assert.equal(SubscriptionService.isExpired({ status: 'expired', current_period_end: FUTURE }), true);
  });

  test('returns true when current_period_end is in the past', () => {
    assert.equal(SubscriptionService.isExpired({ current_period_end: PAST }), true);
  });

  test('returns false when subscription is active with future end date', () => {
    assert.equal(SubscriptionService.isExpired({ status: 'active', current_period_end: FUTURE }), false);
  });

  test('returns false for active trial with future end date', () => {
    assert.equal(SubscriptionService.isExpired({ status: 'trial', current_period_end: FUTURE }), false);
  });
});

describe('SubscriptionService.isBlocked()', () => {
  test('returns true when status is "blocked"', () => {
    assert.equal(SubscriptionService.isBlocked({ status: 'blocked' }), true);
  });

  test('returns false when status is "active"', () => {
    assert.equal(SubscriptionService.isBlocked({ status: 'active' }), false);
  });

  test('returns false when status is "expired"', () => {
    assert.equal(SubscriptionService.isBlocked({ status: 'expired' }), false);
  });

  test('returns false when sub is null', () => {
    assert.equal(SubscriptionService.isBlocked(null), false);
  });

  test('returns false when sub has no status', () => {
    assert.equal(SubscriptionService.isBlocked({}), false);
  });
});

describe('SubscriptionService.getMaxDoctors()', () => {
  test('reads max_doctors from sub directly', () => {
    assert.equal(SubscriptionService.getMaxDoctors({ max_doctors: 5 }), 5);
  });

  test('falls back to plans.max_doctors when sub.max_doctors is undefined', () => {
    assert.equal(SubscriptionService.getMaxDoctors({ plans: { max_doctors: 10 } }), 10);
  });

  test('returns null when neither sub nor plans has the value', () => {
    assert.equal(SubscriptionService.getMaxDoctors({}), null);
  });

  test('sub-level value takes priority over plan-level', () => {
    assert.equal(SubscriptionService.getMaxDoctors({ max_doctors: 3, plans: { max_doctors: 20 } }), 3);
  });

  test('returns -1 for unlimited plans', () => {
    assert.equal(SubscriptionService.getMaxDoctors({ max_doctors: -1 }), -1);
  });
});

describe('SubscriptionService.getMaxPatients()', () => {
  test('reads max_patients from sub directly', () => {
    assert.equal(SubscriptionService.getMaxPatients({ max_patients: 500 }), 500);
  });

  test('falls back to plans.max_patients', () => {
    assert.equal(SubscriptionService.getMaxPatients({ plans: { max_patients: 1000 } }), 1000);
  });

  test('returns null when not defined anywhere', () => {
    assert.equal(SubscriptionService.getMaxPatients({}), null);
  });

  test('sub value takes priority over plan', () => {
    assert.equal(SubscriptionService.getMaxPatients({ max_patients: 200, plans: { max_patients: 999 } }), 200);
  });
});
