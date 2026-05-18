import { prisma } from '../utils/prisma.js';
import { ICompletionService } from '../types/index.js';
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
} from '../utils/errors.js';
import { completionDateSchema } from '../validators/completion.validator.js';
import { AnalyticsService } from './analytics.service.js';

const analyticsService = new AnalyticsService();

export class CompletionService implements ICompletionService {
  /**
   * Mark a habit as complete for a given date.
   * Verifies habit ownership, validates date range, checks for duplicates,
   * creates the completion record, and triggers streak recalculation.
   */
  async markComplete(
    userId: string,
    habitId: string,
    date: string
  ): Promise<{ id: string; habitId: string; date: Date; createdAt: Date }> {
    // Verify habit ownership
    await this.verifyHabitOwnership(userId, habitId);

    // Validate date range (not future, not >7 days past)
    const parseResult = completionDateSchema.safeParse(date);
    if (!parseResult.success) {
      const fields = parseResult.error.issues.map((issue) => ({
        field: 'date',
        message: issue.message,
      }));
      throw validationError('Invalid completion date', fields);
    }

    // Convert YYYY-MM-DD string to a Date object (UTC midnight)
    const completionDate = new Date(date + 'T00:00:00.000Z');

    // Create completion record - catch unique constraint violation for duplicates
    try {
      const completion = await prisma.completion.create({
        data: {
          habitId,
          date: completionDate,
        },
      });

      // Trigger streak recalculation
      await analyticsService.calculateStreak(habitId);

      return {
        id: completion.id,
        habitId: completion.habitId,
        date: completion.date,
        createdAt: completion.createdAt,
      };
    } catch (error: unknown) {
      // Prisma unique constraint violation code
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw conflictError(
          'Completion already exists for this habit and date'
        );
      }
      throw error;
    }
  }

  /**
   * Unmark a habit completion for a given date.
   * Verifies habit ownership, finds the completion record (404 if not found),
   * deletes it, and triggers streak recalculation.
   */
  async unmarkComplete(
    userId: string,
    habitId: string,
    date: string
  ): Promise<void> {
    // Verify habit ownership
    await this.verifyHabitOwnership(userId, habitId);

    // Convert YYYY-MM-DD string to a Date object (UTC midnight)
    const completionDate = new Date(date + 'T00:00:00.000Z');

    // Find the completion record
    const completion = await prisma.completion.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: completionDate,
        },
      },
    });

    if (!completion) {
      throw notFoundError('Completion', `${habitId}/${date}`);
    }

    // Delete the completion record
    await prisma.completion.delete({
      where: { id: completion.id },
    });

    // Trigger streak recalculation
    await analyticsService.calculateStreak(habitId);
  }

  /**
   * Get completions for a habit within a date range.
   * Returns all completion records between startDate and endDate (inclusive).
   */
  async getCompletions(
    habitId: string,
    startDate: string,
    endDate: string
  ): Promise<{ id: string; habitId: string; date: Date; createdAt: Date }[]> {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');

    const completions = await prisma.completion.findMany({
      where: {
        habitId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    return completions.map((c) => ({
      id: c.id,
      habitId: c.habitId,
      date: c.date,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Verify that the habit belongs to the given user.
   * Throws forbiddenError if the habit doesn't belong to the user,
   * or notFoundError if the habit doesn't exist.
   */
  private async verifyHabitOwnership(
    userId: string,
    habitId: string
  ): Promise<void> {
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      throw notFoundError('Habit', habitId);
    }

    if (habit.userId !== userId) {
      throw forbiddenError('You do not have access to this habit');
    }
  }
}
