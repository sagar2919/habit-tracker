import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { IAuthenticationService } from '../types/index.js';
import {
  validationError,
  authenticationError,
  accountLockedError,
  conflictError,
} from '../utils/errors.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export class AuthenticationService implements IAuthenticationService {
  /**
   * Register a new user account.
   * Validates email/password, checks for existing user (case-insensitive),
   * hashes password with bcrypt, creates user and token.
   */
  async register(
    email: string,
    password: string
  ): Promise<{ user: { id: string; email: string }; token: string }> {
    // Validate input
    const parseResult = registerSchema.safeParse({ email, password });
    if (!parseResult.success) {
      const fields = parseResult.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() ?? 'unknown',
        message: issue.message,
      }));
      throw validationError('Validation failed', fields);
    }

    const normalizedEmail = parseResult.data.email;

    // Check for existing user (case-insensitive via normalized email)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw conflictError('An account with this email already exists');
    }

    // Hash password with unique salt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user and token in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
        },
      });

      const tokenValue = this.generateToken(user.id, user.email);
      const expiresAt = new Date(
        Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
      );

      await tx.token.create({
        data: {
          token: tokenValue,
          userId: user.id,
          expiresAt,
        },
      });

      return {
        user: { id: user.id, email: user.email },
        token: tokenValue,
      };
    });

    return result;
  }

  /**
   * Authenticate a user with email and password.
   * Checks account lockout, records login attempts, verifies password,
   * generates JWT token, and stores it in the Token table.
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: { id: string; email: string }; token: string }> {
    // Validate input format
    const parseResult = loginSchema.safeParse({ email, password });
    if (!parseResult.success) {
      const fields = parseResult.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() ?? 'unknown',
        message: issue.message,
      }));
      throw validationError('Validation failed', fields);
    }

    const normalizedEmail = parseResult.data.email;

    // Check account lockout: 5 consecutive failed attempts within 15 minutes
    const lockoutWindowStart = new Date(
      Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000
    );

    const recentAttempts = await prisma.loginAttempt.findMany({
      where: {
        email: normalizedEmail,
        createdAt: { gte: lockoutWindowStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count consecutive failures (stop counting at first success)
    let consecutiveFailures = 0;
    for (const attempt of recentAttempts) {
      if (attempt.success) break;
      consecutiveFailures++;
    }

    if (consecutiveFailures >= LOCKOUT_THRESHOLD) {
      // Calculate retry-after based on the most recent failed attempt
      const mostRecentFailure = recentAttempts[0];
      if (mostRecentFailure) {
        const lockoutEnd = new Date(
          mostRecentFailure.createdAt.getTime() +
            LOCKOUT_WINDOW_MINUTES * 60 * 1000
        );
        const retryAfterSeconds = Math.ceil(
          (lockoutEnd.getTime() - Date.now()) / 1000
        );
        if (retryAfterSeconds > 0) {
          throw accountLockedError(retryAfterSeconds);
        }
      }
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Record failed attempt (no userId since user doesn't exist)
      await prisma.loginAttempt.create({
        data: {
          email: normalizedEmail,
          success: false,
        },
      });
      // Generic error - don't reveal whether email exists
      throw authenticationError('Invalid email or password');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      // Record failed attempt
      await prisma.loginAttempt.create({
        data: {
          email: normalizedEmail,
          userId: user.id,
          success: false,
        },
      });
      // Generic error - don't reveal whether email or password was wrong
      throw authenticationError('Invalid email or password');
    }

    // Record successful attempt
    await prisma.loginAttempt.create({
      data: {
        email: normalizedEmail,
        userId: user.id,
        success: true,
      },
    });

    // Generate JWT token and store in Token table
    const tokenValue = this.generateToken(user.id, user.email);
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await prisma.token.create({
      data: {
        token: tokenValue,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email },
      token: tokenValue,
    };
  }

  /**
   * Invalidate a token (logout).
   * Finds the token and sets invalidated=true.
   */
  async logout(token: string): Promise<void> {
    const tokenRecord = await prisma.token.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return; // Token not found - already logged out or invalid
    }

    await prisma.token.update({
      where: { token },
      data: { invalidated: true },
    });
  }

  /**
   * Validate a token.
   * Checks: token exists in DB, not invalidated, not expired.
   * Returns user info if valid, null otherwise.
   */
  async validateToken(
    token: string
  ): Promise<{ id: string; email: string } | null> {
    const tokenRecord = await prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      return null;
    }

    if (tokenRecord.invalidated) {
      return null;
    }

    if (tokenRecord.expiresAt < new Date()) {
      return null;
    }

    return {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
    };
  }

  /**
   * Generate a JWT token for a user.
   */
  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      getJwtSecret(),
      { expiresIn: `${TOKEN_EXPIRY_HOURS}h` }
    );
  }
}
