import http from 'node:http';
import express, { Application } from 'express';

export const VALID_UUID = '11111111-1111-4111-8111-111111111111';
export const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222';
export const TEST_CLINIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export async function startTestServer(
  router: express.Router,
  mountPath: string,
  middleware?: express.RequestHandler[]
): Promise<TestServer> {
  process.env.NODE_ENV = 'test';
  const app: Application = express();
  app.use(express.json());
  if (middleware) middleware.forEach((m) => app.use(m));
  app.use(mountPath, router);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not resolve server address');

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}

export function authHeaders(role: string, clinicId = TEST_CLINIC_ID, permissions = '') {
  return {
    'Content-Type': 'application/json',
    'x-test-role': role,
    'x-test-clinic-id': clinicId,
    ...(permissions ? { 'x-test-permissions': permissions } : {}),
  };
}
