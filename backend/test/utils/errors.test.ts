import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../../src/utils/errors';

describe('AppError', () => {
  test('sets message and statusCode correctly', () => {
    const err = new AppError('Something went wrong', 500);
    assert.equal(err.message, 'Something went wrong');
    assert.equal(err.statusCode, 500);
  });

  test('isOperational is always true', () => {
    const err = new AppError('test', 400);
    assert.equal(err.isOperational, true);
  });

  test('is an instance of Error', () => {
    const err = new AppError('test', 400);
    assert.ok(err instanceof Error);
  });
});

describe('BadRequestError', () => {
  test('defaults to status 400', () => {
    const err = new BadRequestError();
    assert.equal(err.statusCode, 400);
  });

  test('uses custom message when provided', () => {
    const err = new BadRequestError('Invalid input');
    assert.equal(err.message, 'Invalid input');
  });

  test('uses default message when none provided', () => {
    const err = new BadRequestError();
    assert.equal(err.message, 'Bad Request');
  });
});

describe('UnauthorizedError', () => {
  test('defaults to status 401', () => {
    assert.equal(new UnauthorizedError().statusCode, 401);
  });

  test('uses custom message', () => {
    assert.equal(new UnauthorizedError('Token expired').message, 'Token expired');
  });
});

describe('ForbiddenError', () => {
  test('defaults to status 403', () => {
    assert.equal(new ForbiddenError().statusCode, 403);
  });
});

describe('NotFoundError', () => {
  test('defaults to status 404', () => {
    assert.equal(new NotFoundError().statusCode, 404);
  });

  test('uses custom message', () => {
    assert.equal(new NotFoundError('Patient not found').message, 'Patient not found');
  });
});
