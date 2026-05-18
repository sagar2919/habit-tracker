import { describe, it, expect } from 'vitest';
import { withTimeout } from '../prisma.js';
import { AppError } from '../errors.js';

describe('withTimeout', () => {
  it('should return the result when operation completes within timeout', async () => {
    const result = await withTimeout(() => Promise.resolve('success'), 1000);
    expect(result).toBe('success');
  });

  it('should throw a timeout error when operation exceeds the timeout', async () => {
    const slowOperation = () =>
      new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500));

    try {
      await withTimeout(slowOperation, 50);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.statusCode).toBe(504);
      expect(appError.code).toBe('TIMEOUT');
      expect(appError.userMessage).toBe('Request timed out, please try again');
    }
  });

  it('should propagate errors from the operation', async () => {
    const failingOperation = () => Promise.reject(new Error('DB connection failed'));

    await expect(withTimeout(failingOperation, 1000)).rejects.toThrow('DB connection failed');
  });

  it('should use default 10 second timeout when not specified', async () => {
    // This test just verifies the function works with default timeout
    const result = await withTimeout(() => Promise.resolve(42));
    expect(result).toBe(42);
  });
});
