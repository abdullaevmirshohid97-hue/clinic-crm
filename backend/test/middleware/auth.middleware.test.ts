import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { authMiddleware, checkRole } from '../../src/middleware/auth';
import type { AuthenticatedRequest } from '../../src/types/express';

async function makeRequest(
  server: { url: string; close(): Promise<void> },
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${server.url}/test`, { headers });
  return { status: response.status, body: await response.json() };
}

async function startServer() {
  process.env.NODE_ENV = 'test';
  const app = express();
  app.use(express.json());
  app.use(authMiddleware as any);
  app.get('/test', (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.user });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };

  return {
    url: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise<void>((res, rej) => server.close((e) => e ? rej(e) : res())),
  };
}

describe('authMiddleware in test mode', () => {
  test('injects test user from x-test-role header', async () => {
    const server = await startServer();
    try {
      const { status, body } = await makeRequest(server, {
        'x-test-role': 'admin',
        'x-test-clinic-id': 'clinic-abc',
        'x-test-user-id': 'user-123',
      });
      assert.equal(status, 200);
      assert.equal(body.user.role, 'admin');
      assert.equal(body.user.clinic_id, 'clinic-abc');
      assert.equal(body.user.id, 'user-123');
    } finally {
      await server.close();
    }
  });

  test('parses permissions from x-test-permissions header', async () => {
    const server = await startServer();
    try {
      const { body } = await makeRequest(server, {
        'x-test-role': 'doctor',
        'x-test-permissions': 'pharmacy, queue, dashboard',
      });
      assert.deepEqual(body.user.permissions, ['pharmacy', 'queue', 'dashboard']);
    } finally {
      await server.close();
    }
  });

  test('returns 401 when no auth token or test header is provided', async () => {
    process.env.NODE_ENV = 'production';
    const server = await startServer();
    try {
      const { status, body } = await makeRequest(server, {});
      assert.equal(status, 401);
      assert.equal(body.success, false);
    } finally {
      process.env.NODE_ENV = 'test';
      await server.close();
    }
  });

  test('returns 401 when Authorization header does not start with Bearer', async () => {
    process.env.NODE_ENV = 'production';
    const server = await startServer();
    try {
      const { status } = await makeRequest(server, { Authorization: 'Basic abc123' });
      assert.equal(status, 401);
    } finally {
      process.env.NODE_ENV = 'test';
      await server.close();
    }
  });
});

describe('checkRole middleware (deprecated)', () => {
  function mockRes() {
    let _status = 200;
    let _body: any = null;
    const res = {
      status(code: number) { _status = code; return res; },
      json(body: any) { _body = body; return res; },
      getStatus: () => _status,
      getBody: () => _body,
    };
    return res as any;
  }

  test('calls next() when user has required role', () => {
    let called = false;
    const req: Partial<AuthenticatedRequest> = {
      user: { id: 'u1', clinic_id: 'c1', role: 'admin', permissions: [] },
    };
    checkRole(['admin', 'doctor'])(req as AuthenticatedRequest, mockRes(), () => { called = true; });
    assert.equal(called, true);
  });

  test('returns 403 when user role is not in allowed list', () => {
    const res = mockRes();
    const req: Partial<AuthenticatedRequest> = {
      user: { id: 'u1', clinic_id: 'c1', role: 'cashier', permissions: [] },
    };
    checkRole(['admin', 'doctor'])(req as AuthenticatedRequest, res, () => {});
    assert.equal(res.getStatus(), 403);
  });

  test('returns 403 when req.user is undefined', () => {
    const res = mockRes();
    const req: Partial<AuthenticatedRequest> = {};
    checkRole(['admin'])(req as AuthenticatedRequest, res, () => {});
    assert.equal(res.getStatus(), 403);
  });
});
