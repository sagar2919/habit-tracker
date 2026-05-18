import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error.middleware.js';
import { AppError, validationError, authenticationError, accountLockedError, timeoutError } from '../../utils/errors.js';

function createMockReqRes() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle AppError with correct status code and sanitized response', () => {
    const { req, res, next } = createMockReqRes();
    const error = validationError('Name is required', [
      { field: 'name', message: 'Name is required' },
    ]);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'Name is required',
      fields: [{ field: 'name', message: 'Name is required' }],
    });
  });

  it('should handle authentication errors', () => {
    const { req, res, next } = createMockReqRes();
    const error = authenticationError();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Please log in to continue',
    });
  });

  it('should include retryAfter for account locked errors', () => {
    const { req, res, next } = createMockReqRes();
    const error = accountLockedError(900);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ACCOUNT_LOCKED',
      message: 'Account locked, try again later',
      retryAfter: 900,
    });
  });

  it('should handle timeout errors', () => {
    const { req, res, next } = createMockReqRes();
    const error = timeoutError();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({
      error: 'TIMEOUT',
      message: 'Request timed out, please try again',
    });
  });

  it('should return generic 500 for unknown errors without exposing stack traces', () => {
    const { req, res, next } = createMockReqRes();
    const error = new Error('Some internal database connection failure');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong, please try again',
    });
    // Verify no stack trace or internal message leaked
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall).not.toHaveProperty('stack');
    expect(jsonCall.message).not.toContain('database');
  });

  it('should log full error details internally', () => {
    const { req, res, next } = createMockReqRes();
    const error = new Error('Internal failure');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalled();
    const logArgs = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(logArgs[0]).toContain('Internal failure');
    expect(logArgs[1]).toBeDefined(); // stack trace logged internally
  });

  it('should not include fields in response when AppError has no fields', () => {
    const { req, res, next } = createMockReqRes();
    const error = new AppError('Not found', 404, 'NOT_FOUND', 'Resource not found');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall).not.toHaveProperty('fields');
  });
});
