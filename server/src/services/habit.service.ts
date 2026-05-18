import { prisma } from '../utils/prisma.js';
import { IHabitService, CreateHabitInput, UpdateHabitInput, HabitSchedule, DayOfWeek } from '../types/index.js';
import { createHabitSchema, updateHabitSchema } from '../validators/habit.validator.js';
import { validationError, forbiddenError, notFoundError } from '../utils/errors.js';
import { ScheduleType, DayOfWeek as PrismaDayOfWeek } from '@prisma/client';

// ============================================================
// Mapping Helpers
// ============================================================

/**
 * Maps a HabitSchedule type to Prisma's ScheduleType enum.
 */
function toScheduleType(schedule: HabitSchedule): ScheduleType {
  return schedule.type === 'daily' ? ScheduleType.DAILY : ScheduleType.WEEKLY;
}

/**
 * Maps DayOfWeek strings to Prisma's DayOfWeek enum values.
 */
function toPrismaDays(days: DayOfWeek[]): PrismaDayOfWeek[] {
  const mapping: Record<DayOfWeek, PrismaDayOfWeek> = {
    monday: PrismaDayOfWeek.MONDAY,
    tuesday: PrismaDayOfWeek.TUESDAY,
    wednesday: PrismaDayOfWeek.WEDNESDAY,
    thursday: PrismaDayOfWeek.THURSDAY,
    friday: PrismaDayOfWeek.FRIDAY,
    saturday: PrismaDayOfWeek.SATURDAY,
    sunday: PrismaDayOfWeek.SUNDAY,
  };
  return days.map((day) => mapping[day]);
}

/**
 * Extracts schedule days from a HabitSchedule.
 * Returns empty array for daily schedules.
 */
function getScheduleDays(schedule: HabitSchedule): PrismaDayOfWeek[] {
  if (schedule.type === 'weekly') {
    return toPrismaDays(schedule.days);
  }
  return [];
}

// ============================================================
// Habit Service Implementation
// ============================================================

export class HabitService implements IHabitService {
  /**
   * Create a new habit for a user.
   * Validates name/schedule, trims name, creates habit with initial streak=0.
   */
  async create(
    userId: string,
    data: CreateHabitInput
  ): Promise<{
    id: string;
    name: string;
    scheduleType: string;
    scheduleDays: string[];
    userId: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Validate input
    const parseResult = createHabitSchema.safeParse(data);
    if (!parseResult.success) {
      const fields = parseResult.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() ?? 'unknown',
        message: issue.message,
      }));
      throw validationError('Validation failed', fields);
    }

    const { name, schedule } = parseResult.data;

    // Create habit with initial streak=0
    const habit = await prisma.habit.create({
      data: {
        name,
        scheduleType: toScheduleType(schedule),
        scheduleDays: getScheduleDays(schedule),
        userId,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    return {
      id: habit.id,
      name: habit.name,
      scheduleType: habit.scheduleType,
      scheduleDays: habit.scheduleDays,
      userId: habit.userId,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    };
  }

  /**
   * Update an existing habit.
   * Verifies ownership (403 if not owner), validates name/schedule,
   * updates habit. If schedule changed, streak recalculation will be
   * handled later by the analytics engine.
   */
  async update(
    userId: string,
    habitId: string,
    data: UpdateHabitInput
  ): Promise<{
    id: string;
    name: string;
    scheduleType: string;
    scheduleDays: string[];
    userId: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Verify habit exists and belongs to user
    const existingHabit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      throw notFoundError('Habit', habitId);
    }

    if (existingHabit.userId !== userId) {
      throw forbiddenError('You do not have permission to update this habit');
    }

    // Validate input
    const parseResult = updateHabitSchema.safeParse(data);
    if (!parseResult.success) {
      const fields = parseResult.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() ?? 'unknown',
        message: issue.message,
      }));
      throw validationError('Validation failed', fields);
    }

    const { name, schedule } = parseResult.data;

    // Build update data
    const updateData: {
      name?: string;
      scheduleType?: ScheduleType;
      scheduleDays?: PrismaDayOfWeek[];
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (schedule !== undefined) {
      updateData.scheduleType = toScheduleType(schedule);
      updateData.scheduleDays = getScheduleDays(schedule);
    }

    // Update habit (Prisma update doesn't touch completions)
    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: updateData,
    });

    return {
      id: updatedHabit.id,
      name: updatedHabit.name,
      scheduleType: updatedHabit.scheduleType,
      scheduleDays: updatedHabit.scheduleDays,
      userId: updatedHabit.userId,
      currentStreak: updatedHabit.currentStreak,
      longestStreak: updatedHabit.longestStreak,
      createdAt: updatedHabit.createdAt,
      updatedAt: updatedHabit.updatedAt,
    };
  }

  /**
   * Delete a habit and all associated completions.
   * Verifies ownership (403 if not owner).
   * Cascade delete is handled by Prisma's onDelete: Cascade on the Completion model.
   */
  async delete(userId: string, habitId: string): Promise<void> {
    // Verify habit exists and belongs to user
    const existingHabit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      throw notFoundError('Habit', habitId);
    }

    if (existingHabit.userId !== userId) {
      throw forbiddenError('You do not have permission to delete this habit');
    }

    // Delete habit (completions cascade via Prisma schema)
    await prisma.habit.delete({
      where: { id: habitId },
    });
  }

  /**
   * Get all habits for a user.
   */
  async getAll(userId: string): Promise<{
    id: string;
    name: string;
    scheduleType: string;
    scheduleDays: string[];
    userId: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: Date;
    updatedAt: Date;
  }[]> {
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      scheduleType: habit.scheduleType,
      scheduleDays: habit.scheduleDays,
      userId: habit.userId,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    }));
  }

  /**
   * Get a single habit by ID.
   * Verifies ownership, returns habit or null.
   */
  async getById(
    userId: string,
    habitId: string
  ): Promise<{
    id: string;
    name: string;
    scheduleType: string;
    scheduleDays: string[];
    userId: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      return null;
    }

    if (habit.userId !== userId) {
      throw forbiddenError('You do not have permission to access this habit');
    }

    return {
      id: habit.id,
      name: habit.name,
      scheduleType: habit.scheduleType,
      scheduleDays: habit.scheduleDays,
      userId: habit.userId,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    };
  }
}
