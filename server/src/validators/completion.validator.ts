import { z } from 'zod';

// ============================================================
// Completion Date Validation
// ============================================================

/**
 * Completion date schema: validates that the date is not in the future
 * and not more than 7 days in the past (inclusive of today and 7 days ago).
 *
 * Accepts ISO date strings (YYYY-MM-DD format).
 */
export const completionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return !isNaN(date.getTime());
  }, 'Invalid date')
  .refine((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    const today = getToday();
    return date <= today;
  }, 'Completion date cannot be in the future')
  .refine((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    const sevenDaysAgo = getSevenDaysAgo();
    return date >= sevenDaysAgo;
  }, 'Completion date cannot be more than 7 days in the past');

/**
 * Gets today's date at midnight UTC.
 */
function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Gets the date 7 days ago at midnight UTC.
 */
function getSevenDaysAgo(): Date {
  const today = getToday();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  return sevenDaysAgo;
}

// ============================================================
// Combined Completion Schema
// ============================================================

export const createCompletionSchema = z.object({
  date: completionDateSchema,
});

// ============================================================
// Standalone Validation Functions
// ============================================================

/**
 * Standalone completion date validation function for use in property tests.
 * Accepts a reference date for deterministic testing.
 * Returns { success: true, data: dateString } or { success: false, error: string }.
 */
export function validateCompletionDate(
  input: string,
  referenceDate?: Date
): { success: true; data: string } | { success: false; error: string } {
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { success: false, error: 'Date must be in YYYY-MM-DD format' };
  }

  // Validate it's a real date
  const date = new Date(input + 'T00:00:00.000Z');
  if (isNaN(date.getTime())) {
    return { success: false, error: 'Invalid date' };
  }

  // Use reference date or current date
  const ref = referenceDate ?? new Date();
  const today = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));

  // Check not in the future
  if (date > today) {
    return { success: false, error: 'Completion date cannot be in the future' };
  }

  // Check not more than 7 days in the past
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  if (date < sevenDaysAgo) {
    return { success: false, error: 'Completion date cannot be more than 7 days in the past' };
  }

  return { success: true, data: input };
}
