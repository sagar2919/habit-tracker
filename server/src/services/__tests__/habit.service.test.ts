import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HabitService } from '../habit.service.js';
import { AppError } from '../../utils/errors.js';

// Mock Prisma
vi.mock('../../utils/prisma.js', () => {
  const mockPrisma = {
    habit: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../../utils/prisma.js';

const mockPrisma = prisma as unknown as {
  habit: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe('HabitService', () => {
  let habitService: HabitService;

  beforeEach(() => {
    habitService = new HabitService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a daily habit with valid input', async () => {
      const now = new Date();
      mockPrisma.habit.create.mockResolvedValue({
        id: 'habit-1',
        name: 'Exercise',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: now,
        updatedAt: now,
      });

      const result = await habitService.create('user-1', {
        name: 'Exercise',
        schedule: { type: 'daily' },
      });

      expect(result.id).toBe('habit-1');
      expect(result.name).toBe('Exercise');
      expect(result.scheduleType).toBe('DAILY');
      expect(result.scheduleDays).toEqual([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(mockPrisma.habit.create).toHaveBeenCalledWith({
        data: {
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
        },
      });
    });

    it('should create a weekly habit with valid days', async () => {
      const now = new Date();
      mockPrisma.habit.create.mockResolvedValue({
        id: 'habit-2',
        name: 'Yoga',
        scheduleType: 'WEEKLY',
        scheduleDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: now,
        updatedAt: now,
      });

      const result = await habitService.create('user-1', {
        name: 'Yoga',
        schedule: { type: 'weekly', days: ['monday', 'wednesday', 'friday'] },
      });

      expect(result.scheduleType).toBe('WEEKLY');
      expect(result.scheduleDays).toEqual(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
      expect(mockPrisma.habit.create).toHaveBeenCalledWith({
        data: {
          name: 'Yoga',
          scheduleType: 'WEEKLY',
          scheduleDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
        },
      });
    });

    it('should trim whitespace from habit name', async () => {
      const now = new Date();
      mockPrisma.habit.create.mockResolvedValue({
        id: 'habit-3',
        name: 'Read',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: now,
        updatedAt: now,
      });

      await habitService.create('user-1', {
        name: '  Read  ',
        schedule: { type: 'daily' },
      });

      expect(mockPrisma.habit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Read' }),
      });
    });

    it('should reject empty name after trimming', async () => {
      await expect(
        habitService.create('user-1', {
          name: '   ',
          schedule: { type: 'daily' },
        })
      ).rejects.toThrow(AppError);

      await expect(
        habitService.create('user-1', {
          name: '   ',
          schedule: { type: 'daily' },
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject name exceeding 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        habitService.create('user-1', {
          name: longName,
          schedule: { type: 'daily' },
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject weekly schedule with no days', async () => {
      await expect(
        habitService.create('user-1', {
          name: 'Test',
          schedule: { type: 'weekly', days: [] } as unknown as { type: 'weekly'; days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] },
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject weekly schedule with duplicate days', async () => {
      await expect(
        habitService.create('user-1', {
          name: 'Test',
          schedule: { type: 'weekly', days: ['monday', 'monday'] } as unknown as { type: 'weekly'; days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] },
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('update', () => {
    const existingHabit = {
      id: 'habit-1',
      name: 'Exercise',
      scheduleType: 'DAILY',
      scheduleDays: [],
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update habit name', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);
      mockPrisma.habit.update.mockResolvedValue({
        ...existingHabit,
        name: 'Morning Exercise',
        updatedAt: new Date(),
      });

      const result = await habitService.update('user-1', 'habit-1', {
        name: 'Morning Exercise',
      });

      expect(result.name).toBe('Morning Exercise');
      expect(mockPrisma.habit.update).toHaveBeenCalledWith({
        where: { id: 'habit-1' },
        data: { name: 'Morning Exercise' },
      });
    });

    it('should update habit schedule', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);
      mockPrisma.habit.update.mockResolvedValue({
        ...existingHabit,
        scheduleType: 'WEEKLY',
        scheduleDays: ['MONDAY', 'FRIDAY'],
        updatedAt: new Date(),
      });

      const result = await habitService.update('user-1', 'habit-1', {
        schedule: { type: 'weekly', days: ['monday', 'friday'] },
      });

      expect(result.scheduleType).toBe('WEEKLY');
      expect(result.scheduleDays).toEqual(['MONDAY', 'FRIDAY']);
    });

    it('should reject update if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(
        habitService.update('user-1', 'nonexistent', { name: 'New Name' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject update if user is not the owner (403)', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);

      await expect(
        habitService.update('other-user', 'habit-1', { name: 'Hacked' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should reject update with invalid name', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);

      await expect(
        habitService.update('user-1', 'habit-1', { name: '   ' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('delete', () => {
    const existingHabit = {
      id: 'habit-1',
      name: 'Exercise',
      scheduleType: 'DAILY',
      scheduleDays: [],
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete habit owned by user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);
      mockPrisma.habit.delete.mockResolvedValue(existingHabit);

      await habitService.delete('user-1', 'habit-1');

      expect(mockPrisma.habit.delete).toHaveBeenCalledWith({
        where: { id: 'habit-1' },
      });
    });

    it('should reject delete if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(
        habitService.delete('user-1', 'nonexistent')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject delete if user is not the owner (403)', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);

      await expect(
        habitService.delete('other-user', 'habit-1')
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getAll', () => {
    it('should return all habits for a user', async () => {
      const habits = [
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 5,
          longestStreak: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'habit-2',
          name: 'Read',
          scheduleType: 'WEEKLY',
          scheduleDays: ['MONDAY', 'WEDNESDAY'],
          userId: 'user-1',
          currentStreak: 3,
          longestStreak: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.habit.findMany.mockResolvedValue(habits);

      const result = await habitService.getAll('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Exercise');
      expect(result[1].name).toBe('Read');
      expect(mockPrisma.habit.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no habits', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([]);

      const result = await habitService.getAll('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    const existingHabit = {
      id: 'habit-1',
      name: 'Exercise',
      scheduleType: 'DAILY',
      scheduleDays: [],
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return habit owned by user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);

      const result = await habitService.getById('user-1', 'habit-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('habit-1');
      expect(result!.name).toBe('Exercise');
    });

    it('should return null if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      const result = await habitService.getById('user-1', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should reject with 403 if user is not the owner', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(existingHabit);

      await expect(
        habitService.getById('other-user', 'habit-1')
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
