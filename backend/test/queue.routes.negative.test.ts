import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import queueRouter from '../src/modules/queue/queue.routes';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/queue', queueRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve test server address');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
};

test('queue add route returns 400 for invalid request payload', async () => {
  process.env.NODE_ENV = 'test';
  const server = await startServer();

  try {
    const response = await fetch(`${server.url}/queue/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-role': 'admin',
        'x-test-clinic-id': 'test-clinic-id',
      },
      body: JSON.stringify({
        doctorId: 'not-a-uuid',
      }),
    });

    assert.equal(response.status, 400);
    const data = await response.json() as { success: boolean; message?: string };
    assert.equal(data.success, false);
    assert.equal(data.message, 'Validation failed');
  } finally {
    await server.close();
  }
});

test('queue add route returns 403 when role is not permitted', async () => {
  process.env.NODE_ENV = 'test';
  const server = await startServer();

  try {
    const response = await fetch(`${server.url}/queue/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-role': 'cashier',
        'x-test-clinic-id': 'test-clinic-id',
      },
      body: JSON.stringify({
        doctorId: VALID_UUID,
      }),
    });

    assert.equal(response.status, 403);
    const data = await response.json() as { success: boolean; error?: string };
    assert.equal(data.success, false);
    assert.equal(data.error, 'Forbidden: Insufficient role');
  } finally {
    await server.close();
  }
});
