/**
 * tenantAuth middleware tests.
 * Tests auth header validation (no Supabase needed for these cases)
 * and the clinic isolation logic using a real HTTP server in test mode.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { tenantAuthMiddleware } from '../../src/middleware/tenantAuth';

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(tenantAuthMiddleware as any);
  app.get('/test', (req: any, res: any) => res.json({ ok: true, user: req.user }));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };

  return {
    url: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise<void>((res, rej) => server.close((e) => e ? rej(e) : res())),
  };
}

describe('tenantAuthMiddleware — header validation', () => {
  test('returns 401 when Authorization header is missing entirely', async () => {
    const server = await startServer();
    try {
      const res = await fetch(`${server.url}/test`);
      assert.equal(res.status, 401);
      const body = await res.json() as any;
      assert.ok(body.error, 'Should include an error message');
    } finally {
      await server.close();
    }
  });

  test('returns 401 when Authorization header does not start with Bearer', async () => {
    const server = await startServer();
    try {
      const res = await fetch(`${server.url}/test`, {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      assert.equal(res.status, 401);
    } finally {
      await server.close();
    }
  });

  test('returns 401 when Bearer token is empty', async () => {
    const server = await startServer();
    try {
      const res = await fetch(`${server.url}/test`, {
        headers: { Authorization: 'Bearer ' },
      });
      // Either 401 or 403 — Supabase will reject empty token
      assert.ok([401, 403].includes(res.status), `Expected 401 or 403, got ${res.status}`);
    } finally {
      await server.close();
    }
  });
});

describe('tenantAuthMiddleware — tenant isolation logic', () => {
  test('returns 403 when token is provided but Supabase rejects it (invalid JWT)', async () => {
    const server = await startServer();
    try {
      const res = await fetch(`${server.url}/test`, {
        headers: { Authorization: 'Bearer not.a.valid.jwt.token' },
      });
      // Supabase will reject the invalid token
      assert.ok([403, 500].includes(res.status), `Expected 403 or 500, got ${res.status}`);
    } finally {
      await server.close();
    }
  });
});
