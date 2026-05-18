import { z } from 'zod';
import type { DayOfWeek } from '../types/index.js';

// ============================================================
// Habit Name Validation
// ============================================================

/**
 * Habit name schema: 1-100 characters after trimming whitespace.
 */
export const habitNameSchema = z
  .string()
  .transform((name) => name.trim())
  .pipe(
    z
      .string()
      .min(1, 'Habit name is required')
      .max(100, 'Habit name must be at most 100 characters')
  );

// ============================================================
// Schedule Validation
// ============================================================

const dailyScheduleSchema = z.object({
  type: z.literal('daily'),
});

const weeklyScheduleSchema = z.object({
  type: z.literal('weekly'),
  days: z
    .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .min(1, 'Weekly schedule must have at least 1 day selected')
    .max(7, 'Weekly schedule must have at most 7 days selected')
    .refine(
      (days) => new Set(days).size === days.length,
      'Weekly schedule must not contain duplicate days'
    ),
});

/**
 * Schedule schema: either { type: 'daily' } or { type: 'weekly', days: [...] } with 1-7 valid days.
 */
export const scheduleSchema = z.discriminatedUnion('type', [
  dailyScheduleSchema,
  weeklyScheduleSchema,
]);

// ============================================================
// Combined Habit Schemas
// ============================================================

export const createHabitSchema = z.object({
  name: habitNameSchema,
  schedule: scheduleSchema,
});

export const updateHabitSchema = z.object({
  name: habitNameSchema.optional(),
  schedule: scheduleSchema.optional(),
});

// ============================================================
// Standalone Validation Functions
// ============================================================

/**
 * Standalone habit name validation function for use in property tests.
 * Returns { success: true, data: trimmedName } or { success: false, error: string }.
 */
export function validateHabitName(input: string): { success: true; data: string } | { success: false; error: string } {
  const result = habitNameSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message ?? 'Invalid habit name' };
}

/**
 * Standalone schedule validation function for use in property tests.
 * Returns { success: true, data: schedule } or { success: false, error: string }.
 */
export function validateSchedule(input: unknown): { success: true; data: { type: 'daily' } | { type: 'weekly'; days: DayOfWeek[] } } | { success: false; error: string } {
  const result = scheduleSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message ?? 'Invalid schedule' };
}

/**
 * Standalone full habit validation function for use in property tests.
 * Returns { success: true, data: { name, schedule } } or { success: false, errors: string[] }.
 */
export function validateCreateHabit(input: unknown): { success: true; data: { name: string; schedule: { type: 'daily' } | { type: 'weekly'; days: DayOfWeek[] } } } | { success: false; errors: string[] } {
  const result = createHabitSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}
