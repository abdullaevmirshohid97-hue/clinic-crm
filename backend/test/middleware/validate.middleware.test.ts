import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate';
import type { Request, Response, NextFunction } from 'express';

function mockReq(body = {}, query = {}, params = {}): Request {
  return { body, query, params, headers: {} } as unknown as Request;
}

function mockRes() {
  let _status = 200;
  let _body: any = null;
  const res = {
    status(code: number) { _status = code; return res; },
    json(body: any) { _body = body; return res; },
    getStatus: () => _status,
    getBody: () => _body,
  };
  return res as unknown as Response & { getStatus(): number; getBody(): any };
}

const testSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  }),
});

describe('validate middleware', () => {
  test('calls next() when payload is valid', async () => {
    let called = false;
    const req = mockReq({ name: 'Ali', age: 25 });
    const res = mockRes();
    await validate(testSchema)(req, res, () => { called = true; });
    assert.equal(called, true);
  });

  test('returns 400 when required field is missing', async () => {
    const req = mockReq({ age: 25 });
    const res = mockRes();
    await validate(testSchema)(req, res, () => {});
    assert.equal(res.getStatus(), 400);
    assert.equal(res.getBody().success, false);
    assert.equal(res.getBody().message, 'Validation failed');
  });

  test('returns 400 when field type is wrong', async () => {
    const req = mockReq({ name: 'Ali', age: 'notanumber' });
    const res = mockRes();
    await validate(testSchema)(req, res, () => {});
    assert.equal(res.getStatus(), 400);
  });

  test('returns validation errors array on failure', async () => {
    const req = mockReq({});
    const res = mockRes();
    await validate(testSchema)(req, res, () => {});
    const body = res.getBody();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length > 0);
  });

  test('validates with params and query schema', async () => {
    const schema = z.object({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({}),
    });
    const req = mockReq({}, {}, { id: 'not-a-uuid' });
    const res = mockRes();
    await validate(schema)(req, res, () => {});
    assert.equal(res.getStatus(), 400);
  });
});
