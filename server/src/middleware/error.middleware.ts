import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

/**
 * Global error handling middleware.
 * Logs full error details internally and returns sanitized errors to the client.
 * Never exposes stack traces or internal implementation details.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error internally with timestamp
  console.error(
    `[${new Date().toISOString()}] ${err.message}`,
    err.stack
  );

  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      error: err.code,
      message: err.userMessage,
    };

    if (err.fields) {
      response.fields = err.fields;
    }

    // Handle account locked error with retryAfter
    if ('retryAfter' in err) {
      response.retryAfter = (err as AppError & { retryAfter: number }).retryAfter;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors — return generic 500 without exposing internals
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong, please try again',
  });
}
