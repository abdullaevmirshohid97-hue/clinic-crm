/**
 * Queue route authorization tests.
 * Verifies which roles can and cannot access each endpoint.
 * Uses NODE_ENV=test auth bypass (x-test-role header) so no Supabase needed.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, authHeaders, VALID_UUID } from '../../helpers/setup';
import queueRouter from '../../../src/modules/queue/queue.routes';

const VALID_DOCTOR_ID = VALID_UUID;

describe('GET /queue — role authorization', () => {
  test('admin can access queue list', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue`, { headers: authHeaders('admin') });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally {
      await server.close();
    }
  });

  test('doctor can access queue list', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue`, { headers: authHeaders('doctor') });
      assert.notEqual(res.status, 403);
    } finally {
      await server.close();
    }
  });

  test('cashier can access queue list', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue`, { headers: authHeaders('cashier') });
      assert.notEqual(res.status, 403);
    } finally {
      await server.close();
    }
  });
});

describe('POST /queue/add — role authorization', () => {
  const validBody = JSON.stringify({ doctorId: VALID_DOCTOR_ID });

  test('reception can add to queue', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('reception'),
        body: validBody,
      });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally {
      await server.close();
    }
  });

  test('doctor can add to queue', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('doctor'),
        body: validBody,
      });
      assert.notEqual(res.status, 403);
    } finally {
      await server.close();
    }
  });

  test('cashier cannot add to queue', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('cashier'),
        body: validBody,
      });
      assert.equal(res.status, 403);
    } finally {
      await server.close();
    }
  });
});

describe('POST /queue/add — request validation', () => {
  test('returns 400 when doctorId is not a UUID', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ doctorId: 'invalid-id' }),
      });
      assert.equal(res.status, 400);
      const body = await res.json() as any;
      assert.equal(body.success, false);
    } finally {
      await server.close();
    }
  });

  test('returns 400 when doctorId is missing', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
    } finally {
      await server.close();
    }
  });

  test('schema allows patientName without patientId (passes validation)', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/add`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ doctorId: VALID_DOCTOR_ID, patientName: 'Ali Valiyev' }),
      });
      // Schema is valid — rejection will come from service (Redis/Supabase), not validation (400 with message)
      if (res.status === 400) {
        const body = await res.json() as any;
        assert.notEqual(body.message, 'Validation failed', 'Schema should accept patientName without patientId');
      }
    } finally {
      await server.close();
    }
  });
});

describe('PATCH /queue/:id/status — validation', () => {
  test('returns 400 when status value is invalid', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/${VALID_DOCTOR_ID}/status`, {
        method: 'PATCH',
        headers: authHeaders('admin'),
        body: JSON.stringify({ status: 'unknown_status' }),
      });
      assert.equal(res.status, 400);
    } finally {
      await server.close();
    }
  });

  test('cashier cannot update queue status', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/${VALID_DOCTOR_ID}/status`, {
        method: 'PATCH',
        headers: authHeaders('cashier'),
        body: JSON.stringify({ status: 'in_progress' }),
      });
      assert.equal(res.status, 403);
    } finally {
      await server.close();
    }
  });
});

describe('POST /queue/next — role authorization', () => {
  test('doctor can call next patient', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/next`, {
        method: 'POST',
        headers: authHeaders('doctor'),
        body: JSON.stringify({ doctorId: VALID_DOCTOR_ID }),
      });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally {
      await server.close();
    }
  });

  test('reception cannot call next patient', async () => {
    const server = await startTestServer(queueRouter, '/queue');
    try {
      const res = await fetch(`${server.url}/queue/next`, {
        method: 'POST',
        headers: authHeaders('reception'),
        body: JSON.stringify({ doctorId: VALID_DOCTOR_ID }),
      });
      assert.equal(res.status, 403);
    } finally {
      await server.close();
    }
  });
});
