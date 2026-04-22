import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { sendSuccess, sendPaginated, sendError, parsePagination } from '../../src/utils/response';
import type { Response } from 'express';

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

describe('sendSuccess', () => {
  test('sends 200 with success:true and data by default', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 });
    assert.equal(res.getStatus(), 200);
    assert.deepEqual(res.getBody(), { success: true, data: { id: 1 } });
  });

  test('sends custom status code', () => {
    const res = mockRes();
    sendSuccess(res, {}, 201);
    assert.equal(res.getStatus(), 201);
  });
});

describe('sendPaginated', () => {
  test('includes pagination metadata', () => {
    const res = mockRes();
    sendPaginated(res, [1, 2, 3], 100, 10, 0);
    const body = res.getBody();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, [1, 2, 3]);
    assert.equal(body.pagination.total, 100);
    assert.equal(body.pagination.limit, 10);
    assert.equal(body.pagination.offset, 0);
    assert.equal(body.pagination.hasMore, true);
  });

  test('hasMore is false when all items fetched', () => {
    const res = mockRes();
    sendPaginated(res, [1], 5, 10, 0);
    assert.equal(res.getBody().pagination.hasMore, false);
  });

  test('hasMore is false on last page', () => {
    const res = mockRes();
    sendPaginated(res, [], 20, 10, 10);
    assert.equal(res.getBody().pagination.hasMore, false);
  });
});

describe('sendError', () => {
  test('sends 400 with success:false by default', () => {
    const res = mockRes();
    sendError(res, 'Something broke');
    assert.equal(res.getStatus(), 400);
    assert.deepEqual(res.getBody(), { success: false, error: 'Something broke' });
  });

  test('sends custom status code', () => {
    const res = mockRes();
    sendError(res, 'Not found', 404);
    assert.equal(res.getStatus(), 404);
  });
});

describe('parsePagination', () => {
  test('returns defaults when no params provided', () => {
    const result = parsePagination({});
    assert.equal(result.limit, 50);
    assert.equal(result.offset, 0);
  });

  test('parses limit and offset from string params', () => {
    const result = parsePagination({ limit: '20', offset: '40' });
    assert.equal(result.limit, 20);
    assert.equal(result.offset, 40);
  });

  test('clamps limit to maximum of 100', () => {
    const result = parsePagination({ limit: '999' });
    assert.equal(result.limit, 100);
  });

  test('treats limit=0 as not-provided, falling back to default 50', () => {
    // parseInt('0') is 0, and 0 is falsy so `|| 50` kicks in
    const result = parsePagination({ limit: '0' });
    assert.equal(result.limit, 50);
  });

  test('clamps negative offset to 0', () => {
    const result = parsePagination({ offset: '-10' });
    assert.equal(result.offset, 0);
  });

  test('handles non-numeric strings gracefully', () => {
    const result = parsePagination({ limit: 'abc', offset: 'xyz' });
    assert.equal(result.limit, 50);
    assert.equal(result.offset, 0);
  });
});
