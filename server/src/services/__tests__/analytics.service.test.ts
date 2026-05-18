import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../analytics.service.js';

// Mock Prisma
vi.mock('../../utils/prisma.js', () => {
  const mockPrisma = {
    habit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    completion: {
      findMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../../utils/prisma.js';

const mockPrisma = prisma as unknown as {
  habit: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  completion: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

/**
 * Helper to create a mock habit with completions.
 */
function createMockHabit(overrides: {
  id?: string;
  scheduleType?: 'DAILY' | 'WEEKLY';
  scheduleDays?: string[];
  currentStreak?: number;
  longestStreak?: number;
  createdAt?: Date;
  completions?: { date: Date }[];
}) {
  return {
    id: overrides.id ?? 'habit-1',
    name: 'Test Habit',
    scheduleType: overrides.scheduleType ?? 'DAILY',
    scheduleDays: overrides.scheduleDays ?? [],
    userId: 'user-1',
    currentStreak: overrides.currentStreak ?? 0,
    longestStreak: overrides.longestStreak ?? 0,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date(),
    completions: (overrides.completions ?? []).map((c, i) => ({
      id: `completion-${i}`,
      habitId: overrides.id ?? 'habit-1',
      date: c.date,
      createdAt: new Date(),
    })),
  };
}

/**
 * Helper to create a UTC date from a YYYY-MM-DD string.
 */
function utcDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    vi.clearAllMocks();
    mockPrisma.habit.update.mockResolvedValue({});
  });

  describe('calculateStreak', () => {
    it('should return 0 streak if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      const result = await analyticsService.calculateStreak('nonexistent');

      expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
    });

    it('should return 0 streak for a daily habit with no completions', async () => {
      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        completions: [],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(0);
    });

    it('should calculate streak of 1 for a daily habit with only today completed', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        completions: [{ date: utcDate(todayStr) }],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(1);
    });

    it('should calculate consecutive streak for a daily habit', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        completions: [
          { date: utcDate(todayStr) },
          { date: utcDate(yesterdayStr) },
          { date: utcDate(twoDaysAgoStr) },
        ],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(3);
    });

    it('should reset streak to 0 if most recent scheduled period has no completion (daily)', async () => {
      // Today has no completion, but yesterday does
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        completions: [{ date: utcDate(yesterdayStr) }],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(0);
    });

    it('should break streak at a gap in daily completions', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      // Skip 2 days ago
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        completions: [
          { date: utcDate(todayStr) },
          { date: utcDate(yesterdayStr) },
          { date: utcDate(threeDaysAgoStr) }, // gap at 2 days ago
        ],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(2); // today + yesterday
    });

    it('should calculate streak for a weekly habit (specific days)', async () => {
      // Schedule: MONDAY only
      // We need to find the most recent Monday on or before today
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayDay = todayUTC.getUTCDay();

      // Find the most recent Monday on or before today
      const daysToMonday = todayDay === 0 ? 6 : todayDay - 1;
      const lastMonday = new Date(todayUTC);
      lastMonday.setUTCDate(lastMonday.getUTCDate() - daysToMonday);
      const lastMondayStr = lastMonday.toISOString().split('T')[0];

      // Find the Monday before that
      const prevMonday = new Date(lastMonday);
      prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
      const prevMondayStr = prevMonday.toISOString().split('T')[0];

      // Find the Monday before that
      const prevPrevMonday = new Date(prevMonday);
      prevPrevMonday.setUTCDate(prevPrevMonday.getUTCDate() - 7);
      const prevPrevMondayStr = prevPrevMonday.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'WEEKLY',
        scheduleDays: ['MONDAY'],
        createdAt: utcDate('2024-01-01'),
        completions: [
          { date: utcDate(lastMondayStr) },
          { date: utcDate(prevMondayStr) },
          { date: utcDate(prevPrevMondayStr) },
        ],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      // The most recent scheduled period (Monday) on or before today has a completion
      // The two previous Mondays also have completions → streak = 3
      expect(result.currentStreak).toBe(3);
    });

    it('should update longestStreak when currentStreak exceeds it', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        currentStreak: 1,
        longestStreak: 1,
        completions: [
          { date: utcDate(todayStr) },
          { date: utcDate(yesterdayStr) },
        ],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
      expect(mockPrisma.habit.update).toHaveBeenCalledWith({
        where: { id: 'habit-1' },
        data: { currentStreak: 2, longestStreak: 2 },
      });
    });

    it('should preserve longestStreak when currentStreak is lower', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate('2024-01-01'),
        currentStreak: 5,
        longestStreak: 10,
        completions: [{ date: utcDate(todayStr) }],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10);
      expect(mockPrisma.habit.update).toHaveBeenCalledWith({
        where: { id: 'habit-1' },
        data: { currentStreak: 1, longestStreak: 10 },
      });
    });

    it('should handle a habit created today with a completion today (daily)', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'DAILY',
        createdAt: utcDate(todayStr),
        completions: [{ date: utcDate(todayStr) }],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(1);
    });

    it('should return 0 streak for weekly habit when most recent scheduled day has no completion', async () => {
      const today = new Date();
      const todayDay = today.getUTCDay();

      // Find the most recent Wednesday on or before today
      const daysToWed = (todayDay + 7 - 3) % 7; // 3 = Wednesday
      const lastWed = new Date(today);
      lastWed.setUTCDate(lastWed.getUTCDate() - daysToWed);
      // Don't add a completion for lastWed

      // But add one for the Wednesday before
      const prevWed = new Date(lastWed);
      prevWed.setUTCDate(prevWed.getUTCDate() - 7);
      const prevWedStr = prevWed.toISOString().split('T')[0];

      const habit = createMockHabit({
        scheduleType: 'WEEKLY',
        scheduleDays: ['WEDNESDAY'],
        createdAt: utcDate('2024-01-01'),
        completions: [{ date: utcDate(prevWedStr) }],
      });
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateStreak('habit-1');

      expect(result.currentStreak).toBe(0);
    });
  });

  describe('calculateConsistency', () => {
    it('should return 0 if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      const result = await analyticsService.calculateConsistency('nonexistent', '7d');

      expect(result).toBe(0);
    });

    it('should return 0 if there are zero scheduled periods in the window', async () => {
      // Weekly habit with MONDAY only, created today (if today is not Monday, 
      // and window is 7d but no Monday falls in the window since creation)
      // Simplest case: habit created in the future relative to window
      const today = new Date();
      // Create a habit that was created tomorrow (edge case: window start > today)
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: tomorrow,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      expect(result).toBe(0);
    });

    it('should return 100% for a daily habit with all days completed in 7d window', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 10 days ago so it covers the full 7d window
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 10);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Generate completions for all 7 days
      const completions = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(todayUTC);
        date.setUTCDate(date.getUTCDate() - i);
        completions.push({ id: `c-${i}`, habitId: 'habit-1', date, createdAt: new Date() });
      }
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      expect(result).toBe(100);
    });

    it('should return correct percentage for partial completions in 7d window', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 10 days ago
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 10);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Only 3 out of 7 days completed
      const completions = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(todayUTC);
        date.setUTCDate(date.getUTCDate() - i);
        completions.push({ id: `c-${i}`, habitId: 'habit-1', date, createdAt: new Date() });
      }
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      // 3/7 * 100 = 42.857... → rounded to 42.9
      expect(result).toBe(42.9);
    });

    it('should clamp window start to habit creation date', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 3 days ago (less than 7d window)
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 3);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Complete all 4 days (creation day + 3 days after = today)
      const completions = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date(todayUTC);
        date.setUTCDate(date.getUTCDate() - i);
        completions.push({ id: `c-${i}`, habitId: 'habit-1', date, createdAt: new Date() });
      }
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      // Only 4 scheduled periods (clamped to creation date), all completed
      expect(result).toBe(100);
    });

    it('should handle weekly habits correctly in consistency calculation', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 30 days ago
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 30);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'WEEKLY',
        scheduleDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Count how many Mon/Wed/Fri are in the 7d window
      const windowStart = new Date(todayUTC);
      windowStart.setUTCDate(windowStart.getUTCDate() - 6);

      const scheduledDays: Date[] = [];
      const current = new Date(windowStart);
      while (current <= todayUTC) {
        const day = current.getUTCDay();
        if (day === 1 || day === 3 || day === 5) { // Mon, Wed, Fri
          scheduledDays.push(new Date(current));
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // Complete only the first scheduled day
      const completions = scheduledDays.length > 0
        ? [{ id: 'c-0', habitId: 'habit-1', date: scheduledDays[0], createdAt: new Date() }]
        : [];
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      if (scheduledDays.length === 0) {
        expect(result).toBe(0);
      } else {
        const expected = Math.round((1 / scheduledDays.length) * 100 * 10) / 10;
        expect(result).toBe(expected);
      }
    });

    it('should calculate consistency for 30d window', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 60 days ago
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 60);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Complete 15 out of 30 days
      const completions = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date(todayUTC);
        date.setUTCDate(date.getUTCDate() - (i * 2)); // every other day
        completions.push({ id: `c-${i}`, habitId: 'habit-1', date, createdAt: new Date() });
      }
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '30d');

      // 15/30 * 100 = 50.0
      expect(result).toBe(50);
    });

    it('should calculate consistency for all-time window', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 10 days ago
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 9); // 10 days total (including today)

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Complete 5 out of 10 days
      const completions = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(todayUTC);
        date.setUTCDate(date.getUTCDate() - i);
        completions.push({ id: `c-${i}`, habitId: 'habit-1', date, createdAt: new Date() });
      }
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', 'all');

      // 5/10 * 100 = 50.0
      expect(result).toBe(50);
    });

    it('should return 0 for weekly habit with no scheduled days in window', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit today with empty scheduleDays (edge case)
      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'WEEKLY',
        scheduleDays: [], // no days selected
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: todayUTC,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);
      mockPrisma.completion.findMany.mockResolvedValue([]);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      expect(result).toBe(0);
    });

    it('should round to 1 decimal place', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 10 days ago so full 7d window is covered
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 10);

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // 1 out of 7 days = 14.285... → 14.3
      const completions = [
        { id: 'c-0', habitId: 'habit-1', date: todayUTC, createdAt: new Date() },
      ];
      mockPrisma.completion.findMany.mockResolvedValue(completions);

      const result = await analyticsService.calculateConsistency('habit-1', '7d');

      expect(result).toBe(14.3);
    });
  });

  describe('getHeatmapData', () => {
    it('should return empty array if habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      const result = await analyticsService.getHeatmapData('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return heatmap entries for a daily habit with some completions', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];

      // Create habit 5 days ago
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 4); // 5 days total

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);

      // Complete today and 2 days ago
      const twoDaysAgo = new Date(todayUTC);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
      mockPrisma.completion.findMany.mockResolvedValue([
        { id: 'c-0', habitId: 'habit-1', date: todayUTC, createdAt: new Date() },
        { id: 'c-1', habitId: 'habit-1', date: twoDaysAgo, createdAt: new Date() },
      ]);

      const result = await analyticsService.getHeatmapData('habit-1');

      // Should have 5 entries (one per day since creation)
      expect(result).toHaveLength(5);

      // Today should be level 4 (completed)
      const todayEntry = result.find(e => e.date === todayStr);
      expect(todayEntry?.level).toBe(4);

      // 2 days ago should be level 4 (completed)
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
      const twoDaysAgoEntry = result.find(e => e.date === twoDaysAgoStr);
      expect(twoDaysAgoEntry?.level).toBe(4);

      // Other days should be level 0 (not completed)
      const incompleteDays = result.filter(e => e.level === 0);
      expect(incompleteDays).toHaveLength(3);
    });

    it('should only include scheduled days for weekly habits', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Create habit 14 days ago with MONDAY schedule
      const createdAt = new Date(todayUTC);
      createdAt.setUTCDate(createdAt.getUTCDate() - 13); // 14 days total

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'WEEKLY',
        scheduleDays: ['MONDAY'],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt,
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);
      mockPrisma.completion.findMany.mockResolvedValue([]);

      const result = await analyticsService.getHeatmapData('habit-1');

      // In 14 days, there should be exactly 2 Mondays
      expect(result.length).toBe(2);
      // All entries should be level 0 (no completions)
      expect(result.every(e => e.level === 0)).toBe(true);
      // All entries should be on Mondays
      for (const entry of result) {
        const date = new Date(entry.date + 'T00:00:00.000Z');
        expect(date.getUTCDay()).toBe(1); // Monday
      }
    });

    it('should classify completed days as level 4', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];

      const habit = {
        id: 'habit-1',
        name: 'Test Habit',
        scheduleType: 'DAILY',
        scheduleDays: [],
        userId: 'user-1',
        currentStreak: 0,
        longestStreak: 0,
        createdAt: todayUTC, // created today
        updatedAt: new Date(),
      };
      mockPrisma.habit.findUnique.mockResolvedValue(habit);
      mockPrisma.completion.findMany.mockResolvedValue([
        { id: 'c-0', habitId: 'habit-1', date: todayUTC, createdAt: new Date() },
      ]);

      const result = await analyticsService.getHeatmapData('habit-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ date: todayStr, level: 4 });
    });
  });

  describe('getDashboardSummary', () => {
    it('should return empty habits and allCompletedToday=true when user has no habits', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.habits).toEqual([]);
      expect(result.allCompletedToday).toBe(true);
    });

    it('should mark daily habit as completed when it has a completion today', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 5,
          longestStreak: 10,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [{ id: 'c-1', habitId: 'habit-1', date: todayUTC, createdAt: new Date() }],
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.habits).toHaveLength(1);
      expect(result.habits[0].todayStatus).toBe('completed');
      expect(result.habits[0].currentStreak).toBe(5);
      expect(result.allCompletedToday).toBe(true);
    });

    it('should mark daily habit as incomplete when it has no completion today', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 10,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [], // no completion today
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.habits[0].todayStatus).toBe('incomplete');
      expect(result.allCompletedToday).toBe(false);
    });

    it('should mark weekly habit as not_scheduled when today is not a scheduled day', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayDay = todayUTC.getUTCDay();

      // Pick a day that is NOT today
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const notTodayIndex = (todayDay + 1) % 7;
      const notTodayDay = dayNames[notTodayIndex];

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Yoga',
          scheduleType: 'WEEKLY',
          scheduleDays: [notTodayDay],
          userId: 'user-1',
          currentStreak: 3,
          longestStreak: 7,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [],
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.habits[0].todayStatus).toBe('not_scheduled');
      // allCompletedToday should be true since no habits are scheduled today
      expect(result.allCompletedToday).toBe(true);
    });

    it('should set allCompletedToday=true when all scheduled habits are completed', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 5,
          longestStreak: 10,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [{ id: 'c-1', habitId: 'habit-1', date: todayUTC, createdAt: new Date() }],
        },
        {
          id: 'habit-2',
          name: 'Read',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 3,
          longestStreak: 5,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [{ id: 'c-2', habitId: 'habit-2', date: todayUTC, createdAt: new Date() }],
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.allCompletedToday).toBe(true);
    });

    it('should set allCompletedToday=false when any scheduled habit is incomplete', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 5,
          longestStreak: 10,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [{ id: 'c-1', habitId: 'habit-1', date: todayUTC, createdAt: new Date() }],
        },
        {
          id: 'habit-2',
          name: 'Read',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 5,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [], // not completed
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.allCompletedToday).toBe(false);
    });

    it('should return correct schedule object for daily and weekly habits', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayDay = todayUTC.getUTCDay();
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const todayDayName = dayNames[todayDay];

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Daily Habit',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [],
        },
        {
          id: 'habit-2',
          name: 'Weekly Habit',
          scheduleType: 'WEEKLY',
          scheduleDays: [todayDayName, 'FRIDAY'],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [],
        },
      ]);

      const result = await analyticsService.getDashboardSummary('user-1');

      expect(result.habits[0].schedule).toEqual({ type: 'daily' });
      expect(result.habits[1].schedule.type).toBe('weekly');
      if (result.habits[1].schedule.type === 'weekly') {
        expect(result.habits[1].schedule.days).toContain(todayDayName.toLowerCase());
        expect(result.habits[1].schedule.days).toContain('friday');
      }
    });
  });

  describe('getWeeklySummary', () => {
    it('should return 7 days (Monday through Sunday) with zero counts when no habits exist', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([]);

      const result = await analyticsService.getWeeklySummary('user-1');

      expect(result.days).toHaveLength(7);
      // All days should have 0 completedCount and 0 totalScheduled
      for (const day of result.days) {
        expect(day.completedCount).toBe(0);
        expect(day.totalScheduled).toBe(0);
      }

      // Verify the first day is a Monday
      const firstDate = new Date(result.days[0].date + 'T00:00:00.000Z');
      expect(firstDate.getUTCDay()).toBe(1); // Monday

      // Verify the last day is a Sunday
      const lastDate = new Date(result.days[6].date + 'T00:00:00.000Z');
      expect(lastDate.getUTCDay()).toBe(0); // Sunday
    });

    it('should count daily habits as scheduled every day of the week', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [
            { id: 'c-1', habitId: 'habit-1', date: todayUTC, createdAt: new Date() },
          ],
        },
      ]);

      const result = await analyticsService.getWeeklySummary('user-1');

      // Every day should have totalScheduled = 1
      for (const day of result.days) {
        expect(day.totalScheduled).toBe(1);
      }

      // Only today should have completedCount = 1
      const todayEntry = result.days.find(d => d.date === todayStr);
      expect(todayEntry?.completedCount).toBe(1);

      // Other days should have completedCount = 0
      const otherDays = result.days.filter(d => d.date !== todayStr);
      for (const day of otherDays) {
        expect(day.completedCount).toBe(0);
      }
    });

    it('should only count weekly habits on their scheduled days', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Yoga',
          scheduleType: 'WEEKLY',
          scheduleDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [],
        },
      ]);

      const result = await analyticsService.getWeeklySummary('user-1');

      // Monday (index 0), Wednesday (index 2), Friday (index 4) should have totalScheduled = 1
      expect(result.days[0].totalScheduled).toBe(1); // Monday
      expect(result.days[1].totalScheduled).toBe(0); // Tuesday
      expect(result.days[2].totalScheduled).toBe(1); // Wednesday
      expect(result.days[3].totalScheduled).toBe(0); // Thursday
      expect(result.days[4].totalScheduled).toBe(1); // Friday
      expect(result.days[5].totalScheduled).toBe(0); // Saturday
      expect(result.days[6].totalScheduled).toBe(0); // Sunday
    });

    it('should count completions correctly for multiple habits', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const todayDay = todayUTC.getUTCDay();

      // Find Monday of this week
      const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
      const monday = new Date(todayUTC);
      monday.setUTCDate(monday.getUTCDate() - daysFromMonday);
      const mondayStr = monday.toISOString().split('T')[0];

      mockPrisma.habit.findMany.mockResolvedValue([
        {
          id: 'habit-1',
          name: 'Exercise',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [
            { id: 'c-1', habitId: 'habit-1', date: monday, createdAt: new Date() },
          ],
        },
        {
          id: 'habit-2',
          name: 'Read',
          scheduleType: 'DAILY',
          scheduleDays: [],
          userId: 'user-1',
          currentStreak: 0,
          longestStreak: 0,
          createdAt: utcDate('2024-01-01'),
          updatedAt: new Date(),
          completions: [
            { id: 'c-2', habitId: 'habit-2', date: monday, createdAt: new Date() },
          ],
        },
      ]);

      const result = await analyticsService.getWeeklySummary('user-1');

      // Monday should have 2 scheduled and 2 completed
      const mondayEntry = result.days.find(d => d.date === mondayStr);
      expect(mondayEntry?.totalScheduled).toBe(2);
      expect(mondayEntry?.completedCount).toBe(2);
    });
  });
});
