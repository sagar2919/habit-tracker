import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticationService } from '../auth.service.js';
import { AppError } from '../../utils/errors.js';

// Mock Prisma
vi.mock('../../utils/prisma.js', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    token: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loginAttempt: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        user: {
          findUnique: mockPrisma.user.findUnique,
          create: mockPrisma.user.create,
        },
        token: {
          findUnique: mockPrisma.token.findUnique,
          create: mockPrisma.token.create,
          update: mockPrisma.token.update,
        },
        loginAttempt: {
          findMany: mockPrisma.loginAttempt.findMany,
          create: mockPrisma.loginAttempt.create,
        },
      });
    }),
  };
  return { prisma: mockPrisma };
});

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
  },
}));

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing';

import { prisma } from '../../utils/prisma.js';
import bcrypt from 'bcrypt';

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  token: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  loginAttempt: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('AuthenticationService', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with valid email and password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.token.create.mockResolvedValue({
        id: 'token-123',
        token: 'mock-jwt-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        invalidated: false,
        createdAt: new Date(),
      });

      const result = await authService.register('Test@Example.com', 'Password1');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-123');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.token.create.mockResolvedValue({
        id: 'token-123',
        token: 'mock-jwt-token',
        userId: 'user-123',
        expiresAt: new Date(),
        invalidated: false,
        createdAt: new Date(),
      });

      await authService.register('USER@EXAMPLE.COM', 'Password1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should reject registration with existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(
        authService.register('test@example.com', 'Password1')
      ).rejects.toThrow(AppError);

      await expect(
        authService.register('test@example.com', 'Password1')
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should reject registration with invalid email', async () => {
      await expect(
        authService.register('not-an-email', 'Password1')
      ).rejects.toThrow(AppError);

      await expect(
        authService.register('not-an-email', 'Password1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject registration with weak password (no uppercase)', async () => {
      await expect(
        authService.register('test@example.com', 'password1')
      ).rejects.toThrow(AppError);
    });

    it('should reject registration with short password', async () => {
      await expect(
        authService.register('test@example.com', 'Pass1')
      ).rejects.toThrow(AppError);
    });

    it('should reject registration with password missing digit', async () => {
      await expect(
        authService.register('test@example.com', 'Password')
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.token.create.mockResolvedValue({
        id: 'token-123',
        token: 'mock-jwt-token',
        userId: 'user-123',
        expiresAt: new Date(),
        invalidated: false,
        createdAt: new Date(),
      });

      const result = await authService.login('test@example.com', 'Password1');

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return generic error for non-existent email', async () => {
      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await expect(
        authService.login('nonexistent@example.com', 'Password1')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should return generic error for wrong password', async () => {
      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await expect(
        authService.login('test@example.com', 'WrongPass1')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should lock account after 5 consecutive failed attempts', async () => {
      const now = new Date();
      const recentFailures = Array.from({ length: 5 }, (_, i) => ({
        id: `attempt-${i}`,
        email: 'test@example.com',
        userId: 'user-123',
        success: false,
        createdAt: new Date(now.getTime() - i * 60 * 1000), // 1 min apart
      }));

      mockPrisma.loginAttempt.findMany.mockResolvedValue(recentFailures);

      await expect(
        authService.login('test@example.com', 'Password1')
      ).rejects.toMatchObject({ statusCode: 423 });
    });

    it('should allow login after lockout period expires', async () => {
      // Failures are older than 15 minutes - lockout expired
      const oldTime = new Date(Date.now() - 20 * 60 * 1000);
      const oldFailures = Array.from({ length: 5 }, (_, i) => ({
        id: `attempt-${i}`,
        email: 'test@example.com',
        userId: 'user-123',
        success: false,
        createdAt: new Date(oldTime.getTime() - i * 60 * 1000),
      }));

      // These are outside the 15-min window, so findMany returns empty
      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.token.create.mockResolvedValue({
        id: 'token-123',
        token: 'mock-jwt-token',
        userId: 'user-123',
        expiresAt: new Date(),
        invalidated: false,
        createdAt: new Date(),
      });

      const result = await authService.login('test@example.com', 'Password1');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should reset lockout counter after a successful login', async () => {
      // 3 failures then 1 success then 2 failures = only 2 consecutive failures
      const now = new Date();
      const attempts = [
        { id: '1', email: 'test@example.com', userId: 'user-123', success: false, createdAt: new Date(now.getTime() - 1000) },
        { id: '2', email: 'test@example.com', userId: 'user-123', success: false, createdAt: new Date(now.getTime() - 2000) },
        { id: '3', email: 'test@example.com', userId: 'user-123', success: true, createdAt: new Date(now.getTime() - 3000) },
        { id: '4', email: 'test@example.com', userId: 'user-123', success: false, createdAt: new Date(now.getTime() - 4000) },
        { id: '5', email: 'test@example.com', userId: 'user-123', success: false, createdAt: new Date(now.getTime() - 5000) },
        { id: '6', email: 'test@example.com', userId: 'user-123', success: false, createdAt: new Date(now.getTime() - 6000) },
      ];

      mockPrisma.loginAttempt.findMany.mockResolvedValue(attempts);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.token.create.mockResolvedValue({
        id: 'token-123',
        token: 'mock-jwt-token',
        userId: 'user-123',
        expiresAt: new Date(),
        invalidated: false,
        createdAt: new Date(),
      });

      // Should not be locked since only 2 consecutive failures
      const result = await authService.login('test@example.com', 'Password1');
      expect(result.token).toBe('mock-jwt-token');
    });
  });

  describe('logout', () => {
    it('should invalidate an existing token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'valid-token',
        userId: 'user-123',
        invalidated: false,
      });
      mockPrisma.token.update.mockResolvedValue({});

      await authService.logout('valid-token');

      expect(mockPrisma.token.update).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        data: { invalidated: true },
      });
    });

    it('should not throw for non-existent token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue(null);

      await expect(authService.logout('non-existent-token')).resolves.toBeUndefined();
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'valid-token',
        userId: 'user-123',
        invalidated: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const result = await authService.validateToken('valid-token');

      expect(result).toEqual({ id: 'user-123', email: 'test@example.com' });
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue(null);

      const result = await authService.validateToken('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for invalidated token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'invalidated-token',
        userId: 'user-123',
        invalidated: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const result = await authService.validateToken('invalidated-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockPrisma.token.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'expired-token',
        userId: 'user-123',
        invalidated: false,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const result = await authService.validateToken('expired-token');
      expect(result).toBeNull();
    });
  });
});
