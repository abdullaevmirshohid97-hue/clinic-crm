import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { allowRoles, allowPermissions, assertRole, ROLE_HIERARCHY } from '../../src/middleware/rbac.middleware';
import type { AuthenticatedRequest } from '../../src/types/express';
import type { Response, NextFunction } from 'express';

function mockRes() {
  const res: Partial<Response> = {};
  let _statusCode = 200;
  let _body: any = null;
  res.status = (code: number) => { _statusCode = code; return res as Response; };
  res.json = (body: any) => { _body = body; return res as Response; };
  return { res: res as Response, getStatus: () => _statusCode, getBody: () => _body };
}

function mockReq(role?: string, permissions: string[] = []): AuthenticatedRequest {
  const req: Partial<AuthenticatedRequest> = { headers: {} };
  if (role) {
    req.user = { id: 'u1', clinic_id: 'c1', role: role as any, permissions };
  }
  return req as AuthenticatedRequest;
}

describe('allowRoles middleware', () => {
  test('returns 401 when user is not set on request', () => {
    const { res, getStatus } = mockRes();
    const next = () => {};
    allowRoles('admin')(mockReq(), res, next as NextFunction);
    assert.equal(getStatus(), 401);
  });

  test('grants access when user has the required role directly', () => {
    let called = false;
    const { res } = mockRes();
    allowRoles('doctor')(mockReq('doctor'), res, () => { called = true; });
    assert.equal(called, true);
  });

  test('grants access to super_admin for any route', () => {
    let called = false;
    const { res } = mockRes();
    allowRoles('cashier')(mockReq('super_admin'), res, () => { called = true; });
    assert.equal(called, true);
  });

  test('returns 403 when role is insufficient', () => {
    const { res, getStatus, getBody } = mockRes();
    allowRoles('admin')(mockReq('reception'), res, () => {});
    assert.equal(getStatus(), 403);
    assert.equal(getBody().success, false);
  });

  test('returns 403 for cashier trying to access doctor-only route', () => {
    const { res, getStatus } = mockRes();
    allowRoles('doctor')(mockReq('cashier'), res, () => {});
    assert.equal(getStatus(), 403);
  });
});

describe('allowPermissions middleware', () => {
  test('returns 401 when user is not set', () => {
    const { res, getStatus } = mockRes();
    allowPermissions('pharmacy')(mockReq(), res, () => {});
    assert.equal(getStatus(), 401);
  });

  test('grants access when user has required permission', () => {
    let called = false;
    const { res } = mockRes();
    allowPermissions('pharmacy')(mockReq('pharmacist', ['pharmacy', 'dashboard']), res, () => { called = true; });
    assert.equal(called, true);
  });

  test('returns 403 when user is missing required permission', () => {
    const { res, getStatus, getBody } = mockRes();
    allowPermissions('analytics')(mockReq('reception', ['dashboard', 'queue']), res, () => {});
    assert.equal(getStatus(), 403);
    assert.equal(getBody().success, false);
  });

  test('requires ALL listed permissions (not just one)', () => {
    const { res, getStatus } = mockRes();
    allowPermissions('analytics', 'staff')(mockReq('doctor', ['analytics']), res, () => {});
    assert.equal(getStatus(), 403);
  });

  test('grants access when user has all required permissions', () => {
    let called = false;
    const { res } = mockRes();
    allowPermissions('analytics', 'staff')(mockReq('admin', ['analytics', 'staff', 'dashboard']), res, () => { called = true; });
    assert.equal(called, true);
  });
});

describe('assertRole helper', () => {
  test('does not throw when role is allowed', () => {
    assert.doesNotThrow(() => assertRole('admin', 'admin', 'super_admin'));
  });

  test('does not throw for super_admin regardless of allowed list', () => {
    assert.doesNotThrow(() => assertRole('super_admin', 'cashier'));
  });

  test('throws when role is not in allowed list', () => {
    assert.throws(() => assertRole('reception', 'admin', 'super_admin'), /Forbidden/);
  });

  test('throws for nurse trying to perform admin action', () => {
    assert.throws(() => assertRole('nurse', 'doctor', 'admin'), /Forbidden/);
  });
});

describe('ROLE_HIERARCHY values', () => {
  test('super_admin has the highest level', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    assert.equal(ROLE_HIERARCHY.super_admin, Math.max(...levels));
  });

  test('admin level is lower than super_admin', () => {
    assert.ok(ROLE_HIERARCHY.admin < ROLE_HIERARCHY.super_admin);
  });

  test('reception has the lowest level', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    assert.equal(ROLE_HIERARCHY.reception, Math.min(...levels));
  });
});
