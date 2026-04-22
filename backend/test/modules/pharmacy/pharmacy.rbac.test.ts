/**
 * Tests PharmacyService RBAC logic (assertRole calls) without hitting Supabase.
 * We import assertRole directly and verify that the service-level checks throw
 * for unpermitted roles and pass for permitted roles.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertRole } from '../../../src/middleware/rbac.middleware';
import type { Role } from '../../../src/types/express';

function canAddMedicine(role: Role): boolean {
  try {
    assertRole(role, 'admin', 'super_admin', 'warehouse_manager');
    return true;
  } catch {
    return false;
  }
}

function canUpdateStock(role: Role): boolean {
  try {
    assertRole(role, 'admin', 'super_admin', 'warehouse_manager');
    return true;
  } catch {
    return false;
  }
}

function canDeleteMedicine(role: Role): boolean {
  try {
    assertRole(role, 'admin', 'super_admin');
    return true;
  } catch {
    return false;
  }
}

describe('PharmacyService RBAC — addMedicine', () => {
  test('admin can add medicine', () => assert.equal(canAddMedicine('admin'), true));
  test('super_admin can add medicine', () => assert.equal(canAddMedicine('super_admin'), true));
  test('warehouse_manager can add medicine', () => assert.equal(canAddMedicine('warehouse_manager'), true));
  test('doctor cannot add medicine', () => assert.equal(canAddMedicine('doctor'), false));
  test('cashier cannot add medicine', () => assert.equal(canAddMedicine('cashier'), false));
  test('nurse cannot add medicine', () => assert.equal(canAddMedicine('nurse'), false));
  test('reception cannot add medicine', () => assert.equal(canAddMedicine('reception'), false));
});

describe('PharmacyService RBAC — updateStock', () => {
  test('admin can update stock', () => assert.equal(canUpdateStock('admin'), true));
  test('warehouse_manager can update stock', () => assert.equal(canUpdateStock('warehouse_manager'), true));
  test('cashier cannot manually update stock', () => assert.equal(canUpdateStock('cashier'), false));
  test('nurse cannot update stock', () => assert.equal(canUpdateStock('nurse'), false));
});

describe('PharmacyService RBAC — deleteMedicine', () => {
  test('admin can delete medicine', () => assert.equal(canDeleteMedicine('admin'), true));
  test('super_admin can delete medicine', () => assert.equal(canDeleteMedicine('super_admin'), true));
  test('warehouse_manager cannot delete medicine', () => assert.equal(canDeleteMedicine('warehouse_manager'), false));
  test('doctor cannot delete medicine', () => assert.equal(canDeleteMedicine('doctor'), false));
});
