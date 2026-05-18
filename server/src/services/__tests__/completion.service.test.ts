import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletionService } from '../completion.service.js';
import { AppError } from '../../utils/errors.js';

// Mock Prisma
vi.mock('../../utils/prisma.js', () => {
  const mockPrisma = {
    habit: {
      findUnique: vi.fn(),
    },
    completion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../../utils/prisma.js';

const mockPrisma = prisma as unknown as {
  habit: { findUnique: ReturnType<typeof vi.fn> };
  completion: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe('CompletionService', () => {
  let completionService: CompletionService;

  beforeEach(() => {
    completionService = new CompletionService();
    vi.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should create a completion record for a valid date', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });
      mockPrisma.completion.create.mockResolvedValue({
        id: 'completion-1',
        habitId: 'habit-1',
        date: new Date(dateStr + 'T00:00:00.000Z'),
        createdAt: new Date(),
      });

      const result = await completionService.markComplete('user-1', 'habit-1', dateStr);

      expect(result.id).toBe('completion-1');
      expect(result.habitId).toBe('habit-1');
      expect(mockPrisma.completion.create).toHaveBeenCalledWith({
        data: {
          habitId: 'habit-1',
          date: new Date(dateStr + 'T00:00:00.000Z'),
        },
      });
    });

    it('should throw 404 if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(
        completionService.markComplete('user-1', 'nonexistent', '2024-01-01')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if habit does not belong to user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'other-user',
        name: 'Exercise',
      });

      await expect(
        completionService.markComplete('user-1', 'habit-1', '2024-01-01')
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 400 for a future date', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });

      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];

      await expect(
        completionService.markComplete('user-1', 'habit-1', futureDate)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 400 for a date more than 7 days in the past', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });

      const eightDaysAgo = new Date();
      eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8);
      const oldDate = eightDaysAgo.toISOString().split('T')[0];

      await expect(
        completionService.markComplete('user-1', 'habit-1', oldDate)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 409 for duplicate completion', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });
      mockPrisma.completion.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        completionService.markComplete('user-1', 'habit-1', dateStr)
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should throw 400 for invalid date format', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });

      await expect(
        completionService.markComplete('user-1', 'habit-1', 'not-a-date')
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('unmarkComplete', () => {
    it('should delete an existing completion record', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });
      mockPrisma.completion.findUnique.mockResolvedValue({
        id: 'completion-1',
        habitId: 'habit-1',
        date: new Date(dateStr + 'T00:00:00.000Z'),
        createdAt: new Date(),
      });
      mockPrisma.completion.delete.mockResolvedValue({});

      await completionService.unmarkComplete('user-1', 'habit-1', dateStr);

      expect(mockPrisma.completion.delete).toHaveBeenCalledWith({
        where: { id: 'completion-1' },
      });
    });

    it('should throw 404 if completion does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'user-1',
        name: 'Exercise',
      });
      mockPrisma.completion.findUnique.mockResolvedValue(null);

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      await expect(
        completionService.unmarkComplete('user-1', 'habit-1', dateStr)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if habit does not belong to user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue({
        id: 'habit-1',
        userId: 'other-user',
        name: 'Exercise',
      });

      await expect(
        completionService.unmarkComplete('user-1', 'habit-1', '2024-01-01')
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 404 if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(
        completionService.unmarkComplete('user-1', 'nonexistent', '2024-01-01')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getCompletions', () => {
    it('should return completions within date range', async () => {
      const completions = [
        { id: 'c-1', habitId: 'habit-1', date: new Date('2024-01-01T00:00:00.000Z'), createdAt: new Date() },
        { id: 'c-2', habitId: 'habit-1', date: new Date('2024-01-02T00:00:00.000Z'), createdAt: new Date() },
      ];
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await completionService.getCompletions('habit-1', '2024-01-01', '2024-01-07');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c-1');
      expect(result[1].id).toBe('c-2');
      expect(mockPrisma.completion.findMany).toHaveBeenCalledWith({
        where: {
          habitId: 'habit-1',
          date: {
            gte: new Date('2024-01-01T00:00:00.000Z'),
            lte: new Date('2024-01-07T00:00:00.000Z'),
          },
        },
        orderBy: { date: 'asc' },
      });
    });

    it('should return empty array when no completions exist', async () => {
      mockPrisma.completion.findMany.mockResolvedValue([]);

      const result = await completionService.getCompletions('habit-1', '2024-01-01', '2024-01-07');

      expect(result).toHaveLength(0);
    });
  });
});
