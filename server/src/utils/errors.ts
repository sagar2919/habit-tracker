/**
 * Custom application error class with structured error information.
 * Extends the native Error class with HTTP status codes, error codes,
 * user-facing messages, and optional field-level validation details.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly fields?: { field: string; message: string }[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    userMessage: string,
    fields?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.userMessage = userMessage;
    this.fields = fields;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ============================================================
// Error Factory Functions
// ============================================================

/**
 * Creates a 400 Validation Error with optional field-level details.
 */
export function validationError(
  message: string,
  fields?: { field: string; message: string }[]
): AppError {
  return new AppError(
    message,
    400,
    'VALIDATION_ERROR',
    message,
    fields
  );
}

/**
 * Creates a 401 Authentication Error.
 */
export function authenticationError(
  message: string = 'Invalid email or password'
): AppError {
  return new AppError(
    message,
    401,
    'UNAUTHORIZED',
    'Please log in to continue'
  );
}

/**
 * Creates a 403 Forbidden Error.
 */
export function forbiddenError(
  message: string = 'Access denied'
): AppError {
  return new AppError(
    message,
    403,
    'FORBIDDEN',
    "You don't have access to this resource"
  );
}

/**
 * Creates a 404 Not Found Error.
 */
export function notFoundError(
  resource: string,
  id?: string
): AppError {
  const detail = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
  return new AppError(
    detail,
    404,
    'NOT_FOUND',
    'Resource not found'
  );
}

/**
 * Creates a 409 Conflict Error.
 */
export function conflictError(message: string): AppError {
  return new AppError(
    message,
    409,
    'CONFLICT',
    message
  );
}

/**
 * Creates a 423 Account Locked Error with retry-after information.
 */
export function accountLockedError(retryAfter: number): AppError {
  const error = new AppError(
    `Account locked. Retry after ${retryAfter} seconds`,
    423,
    'ACCOUNT_LOCKED',
    'Account locked, try again later'
  );
  // Attach retryAfter as an additional property for the response
  (error as AppError & { retryAfter: number }).retryAfter = retryAfter;
  return error;
}

/**
 * Creates a 504 Timeout Error.
 */
export function timeoutError(
  message: string = 'Request timed out'
): AppError {
  return new AppError(
    message,
    504,
    'TIMEOUT',
    'Request timed out, please try again'
  );
}
