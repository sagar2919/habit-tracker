import { PrismaClient } from '@prisma/client';
import { timeoutError } from './errors.js';

/**
 * Singleton PrismaClient instance for use across all services.
 * Prevents multiple instances during development with hot-reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Wraps a Prisma operation with a timeout.
 * If the operation does not complete within the specified duration,
 * a 504 timeout error is thrown.
 *
 * @param operation - A function returning a Promise (the Prisma operation)
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns The result of the operation
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(timeoutError('Database operation timed out'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
