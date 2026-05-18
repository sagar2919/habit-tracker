import { prisma } from '../utils/prisma.js';
import {
  IAnalyticsEngine,
  StreakResult,
  TimeWindow,
  HeatmapEntry,
  DashboardSummary,
  WeeklySummary,
  DayOfWeek,
} from '../types/index.js';

/**
 * Maps Prisma DayOfWeek enum string values to JavaScript Date.getDay() numbers.
 * JS: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
 */
const PRISMA_DAY_TO_JS_DAY: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/**
 * Formats a Date to a YYYY-MM-DD string in UTC.
 */
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns a new Date set to UTC midnight for the given date, shifted by `days` days.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Gets today's date at UTC midnight.
 */
function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export class AnalyticsService implements IAnalyticsEngine {
  /**
   * Calculate the current and longest streak for a habit.
   *
   * Algorithm:
   * 1. Fetch the habit with its schedule info and all completions.
   * 2. Determine the set of "scheduled days" for the habit's schedule type.
   * 3. Starting from the most recent scheduled period on or before today,
   *    walk backward through scheduled periods.
   * 4. If the most recent scheduled period has no completion, current streak = 0.
   * 5. Otherwise, count consecutive scheduled periods with at least one completion.
   * 6. Update longestStreak if currentStreak exceeds it.
   * 7. Persist updated streak values to the database.
   */
  async calculateStreak(habitId: string): Promise<StreakResult> {
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { completions: { orderBy: { date: 'desc' } } },
    });

    if (!habit) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const today = getToday();
    const completionDates = new Set(
      habit.completions.map((c: { date: Date }) => toDateString(c.date))
    );

    // Convert Prisma DayOfWeek[] to JS day numbers for weekly schedules
    const scheduledJsDays = habit.scheduleDays.map(
      (day: string) => PRISMA_DAY_TO_JS_DAY[day]
    );

    // Find the most recent scheduled period on or before today
    const mostRecentScheduled = this.findMostRecentScheduledDate(
      today,
      habit.scheduleType,
      scheduledJsDays,
      habit.createdAt
    );

    if (!mostRecentScheduled) {
      // No scheduled period exists yet (habit was just created, no scheduled day has occurred)
      const longestStreak = Math.max(0, habit.longestStreak);
      await this.updateStreaks(habitId, 0, longestStreak);
      return { currentStreak: 0, longestStreak };
    }

    // Check if the most recent scheduled period has a completion
    if (!completionDates.has(toDateString(mostRecentScheduled))) {
      // Most recent scheduled period has no completion → streak is 0
      const longestStreak = Math.max(0, habit.longestStreak);
      await this.updateStreaks(habitId, 0, longestStreak);
      return { currentStreak: 0, longestStreak };
    }

    // Count consecutive scheduled periods backward that have completions
    let currentStreak = 1;
    let currentDate = mostRecentScheduled;

    while (true) {
      const prevScheduled = this.findPreviousScheduledDate(
        currentDate,
        habit.scheduleType,
        scheduledJsDays,
        habit.createdAt
      );

      if (!prevScheduled) {
        // No more scheduled periods before the habit's creation
        break;
      }

      if (!completionDates.has(toDateString(prevScheduled))) {
        // Found a scheduled period without a completion → streak ends
        break;
      }

      currentStreak++;
      currentDate = prevScheduled;
    }

    // Update longest streak if current exceeds it
    const longestStreak = Math.max(currentStreak, habit.longestStreak);

    await this.updateStreaks(habitId, currentStreak, longestStreak);

    return { currentStreak, longestStreak };
  }

  /**
   * Find the most recent scheduled date on or before the given date.
   * Returns null if no scheduled date exists on or after the habit's creation date.
   */
  private findMostRecentScheduledDate(
    fromDate: Date,
    scheduleType: string,
    scheduledJsDays: number[],
    createdAt: Date
  ): Date | null {
    const creationDate = new Date(
      Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate()
      )
    );

    if (scheduleType === 'DAILY') {
      // For daily habits, every day is scheduled
      // The most recent scheduled date is today (or fromDate) if it's on or after creation
      if (fromDate >= creationDate) {
        return fromDate;
      }
      return null;
    }

    // For weekly habits, find the most recent day that matches one of the scheduled days
    if (scheduledJsDays.length === 0) {
      return null;
    }

    let current = new Date(fromDate);
    // Look back up to 7 days to find a matching scheduled day
    for (let i = 0; i < 7; i++) {
      if (current < creationDate) {
        return null;
      }
      const dayOfWeek = current.getUTCDay();
      if (scheduledJsDays.includes(dayOfWeek)) {
        return current;
      }
      current = addDays(current, -1);
    }

    return null;
  }

  /**
   * Find the previous scheduled date strictly before the given date.
   * Returns null if no scheduled date exists on or after the habit's creation date.
   */
  private findPreviousScheduledDate(
    fromDate: Date,
    scheduleType: string,
    scheduledJsDays: number[],
    createdAt: Date
  ): Date | null {
    const creationDate = new Date(
      Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate()
      )
    );

    if (scheduleType === 'DAILY') {
      // For daily habits, the previous scheduled date is the day before
      const prev = addDays(fromDate, -1);
      if (prev >= creationDate) {
        return prev;
      }
      return null;
    }

    // For weekly habits, go backward day by day to find the previous scheduled day
    if (scheduledJsDays.length === 0) {
      return null;
    }

    let current = addDays(fromDate, -1);
    // Look back up to 7 days to find a matching scheduled day
    for (let i = 0; i < 7; i++) {
      if (current < creationDate) {
        return null;
      }
      const dayOfWeek = current.getUTCDay();
      if (scheduledJsDays.includes(dayOfWeek)) {
        return current;
      }
      current = addDays(current, -1);
    }

    return null;
  }

  /**
   * Persist updated streak values to the database.
   */
  private async updateStreaks(
    habitId: string,
    currentStreak: number,
    longestStreak: number
  ): Promise<void> {
    await prisma.habit.update({
      where: { id: habitId },
      data: { currentStreak, longestStreak },
    });
  }

  // Placeholder implementations for other IAnalyticsEngine methods.
  // These will be implemented in subsequent tasks.

  /**
   * Calculate the consistency rate for a habit within a given time window.
   *
   * Formula: (scheduled periods with at least one completion / total scheduled periods) * 100
   * Rounded to 1 decimal place. Returns 0 if there are zero scheduled periods.
   *
   * Time windows:
   * - '7d': today back 6 days (7 days total including today)
   * - '30d': today back 29 days (30 days total including today)
   * - 'all': from habit creation date to today
   *
   * The start date is clamped to the habit's creation date.
   */
  async calculateConsistency(
    habitId: string,
    window: TimeWindow
  ): Promise<number> {
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      return 0;
    }

    const today = getToday();
    const creationDate = new Date(
      Date.UTC(
        habit.createdAt.getUTCFullYear(),
        habit.createdAt.getUTCMonth(),
        habit.createdAt.getUTCDate()
      )
    );

    // Determine the window start date
    let windowStart: Date;
    switch (window) {
      case '7d':
        windowStart = addDays(today, -6);
        break;
      case '30d':
        windowStart = addDays(today, -29);
        break;
      case 'all':
        windowStart = creationDate;
        break;
    }

    // Clamp start date to habit creation date
    if (windowStart < creationDate) {
      windowStart = creationDate;
    }

    // If the window start is after today, there are no scheduled periods
    if (windowStart > today) {
      return 0;
    }

    // Convert Prisma DayOfWeek[] to JS day numbers for weekly schedules
    const scheduledJsDays = habit.scheduleDays.map(
      (day: string) => PRISMA_DAY_TO_JS_DAY[day]
    );

    // Count total scheduled periods in the window
    let totalScheduledPeriods = 0;
    const scheduledDates: string[] = [];

    let current = new Date(windowStart);
    while (current <= today) {
      if (habit.scheduleType === 'DAILY') {
        totalScheduledPeriods++;
        scheduledDates.push(toDateString(current));
      } else {
        // WEEKLY: only count days that match the scheduled days
        const dayOfWeek = current.getUTCDay();
        if (scheduledJsDays.includes(dayOfWeek)) {
          totalScheduledPeriods++;
          scheduledDates.push(toDateString(current));
        }
      }
      current = addDays(current, 1);
    }

    // If zero scheduled periods, return 0
    if (totalScheduledPeriods === 0) {
      return 0;
    }

    // Fetch completions within the date range
    const completions = await prisma.completion.findMany({
      where: {
        habitId,
        date: {
          gte: windowStart,
          lte: today,
        },
      },
    });

    // Build a set of completion date strings
    const completionDates = new Set(
      completions.map((c: { date: Date }) => toDateString(c.date))
    );

    // Count scheduled periods that have at least one completion
    let completedPeriods = 0;
    for (const dateStr of scheduledDates) {
      if (completionDates.has(dateStr)) {
        completedPeriods++;
      }
    }

    // Calculate percentage, rounded to 1 decimal place
    const rate = (completedPeriods / totalScheduledPeriods) * 100;
    return Math.round(rate * 10) / 10;
  }

  /**
   * Get heatmap data for a habit over the past 12 months (365 days).
   *
   * For each scheduled day in the range, returns a level:
   * - 0: 0% completion (no completion on that day)
   * - 1: 1-25% completion
   * - 2: 26-50% completion
   * - 3: 51-75% completion
   * - 4: 76-100% completion (completed on that day)
   *
   * Since each day for a single habit is either complete or not,
   * levels will be 0 or 4 in practice.
   */
  async getHeatmapData(habitId: string): Promise<HeatmapEntry[]> {
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      return [];
    }

    const today = getToday();
    const startDate = addDays(today, -364); // 365 days including today

    const creationDate = new Date(
      Date.UTC(
        habit.createdAt.getUTCFullYear(),
        habit.createdAt.getUTCMonth(),
        habit.createdAt.getUTCDate()
      )
    );

    // Clamp start to habit creation date
    const effectiveStart = startDate < creationDate ? creationDate : startDate;

    // Convert Prisma DayOfWeek[] to JS day numbers for weekly schedules
    const scheduledJsDays = habit.scheduleDays.map(
      (day: string) => PRISMA_DAY_TO_JS_DAY[day]
    );

    // Fetch completions within the date range
    const completions = await prisma.completion.findMany({
      where: {
        habitId,
        date: {
          gte: effectiveStart,
          lte: today,
        },
      },
    });

    const completionDates = new Set(
      completions.map((c: { date: Date }) => toDateString(c.date))
    );

    const entries: HeatmapEntry[] = [];
    let current = new Date(effectiveStart);

    while (current <= today) {
      const isScheduled = this.isDayScheduled(current, habit.scheduleType, scheduledJsDays);

      if (isScheduled) {
        const dateStr = toDateString(current);
        const completed = completionDates.has(dateStr);
        // For a single habit, completion is binary: 0% or 100%
        const level = completed ? 4 : 0;
        entries.push({ date: dateStr, level: level as 0 | 1 | 2 | 3 | 4 });
      }

      current = addDays(current, 1);
    }

    return entries;
  }

  /**
   * Get dashboard summary for a user: all habits with today's status,
   * current streak, and whether all scheduled habits are completed today.
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const today = getToday();

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          where: {
            date: today,
          },
        },
      },
    });

    const dashboardHabits: DashboardSummary['habits'] = [];
    let allScheduledCompleted = true;
    let hasScheduledHabits = false;

    for (const habit of habits) {
      const scheduledJsDays = habit.scheduleDays.map(
        (day: string) => PRISMA_DAY_TO_JS_DAY[day]
      );

      const isScheduledToday = this.isDayScheduled(today, habit.scheduleType, scheduledJsDays);

      let todayStatus: 'completed' | 'incomplete' | 'not_scheduled';

      if (!isScheduledToday) {
        todayStatus = 'not_scheduled';
      } else {
        hasScheduledHabits = true;
        const hasCompletion = habit.completions.length > 0;
        if (hasCompletion) {
          todayStatus = 'completed';
        } else {
          todayStatus = 'incomplete';
          allScheduledCompleted = false;
        }
      }

      // Build the schedule object for the response
      const schedule = habit.scheduleType === 'DAILY'
        ? { type: 'daily' as const }
        : { type: 'weekly' as const, days: habit.scheduleDays.map((d: string) => d.toLowerCase() as DayOfWeek) };

      dashboardHabits.push({
        id: habit.id,
        name: habit.name,
        schedule,
        todayStatus,
        currentStreak: habit.currentStreak,
      });
    }

    // If no habits are scheduled today, allCompletedToday is true
    const allCompletedToday = !hasScheduledHabits || allScheduledCompleted;

    return {
      habits: dashboardHabits,
      allCompletedToday,
    };
  }

  /**
   * Get weekly summary for a user: Monday through Sunday of the current week,
   * with completion counts and total scheduled counts per day.
   */
  async getWeeklySummary(userId: string): Promise<WeeklySummary> {
    const today = getToday();
    const todayDay = today.getUTCDay(); // 0=Sunday, 1=Monday, ...

    // Find Monday of the current week
    // If today is Sunday (0), Monday was 6 days ago
    // If today is Monday (1), Monday is today
    // If today is Tuesday (2), Monday was 1 day ago, etc.
    const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
    const monday = addDays(today, -daysFromMonday);
    const sunday = addDays(monday, 6);

    // Fetch all habits for the user
    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          where: {
            date: {
              gte: monday,
              lte: sunday,
            },
          },
        },
      },
    });

    const days: WeeklySummary['days'] = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      const dayStr = toDateString(day);

      let completedCount = 0;
      let totalScheduled = 0;

      for (const habit of habits) {
        const scheduledJsDays = habit.scheduleDays.map(
          (d: string) => PRISMA_DAY_TO_JS_DAY[d]
        );

        const isScheduled = this.isDayScheduled(day, habit.scheduleType, scheduledJsDays);

        if (isScheduled) {
          totalScheduled++;
          // Check if this habit has a completion for this day
          const hasCompletion = habit.completions.some(
            (c: { date: Date }) => toDateString(c.date) === dayStr
          );
          if (hasCompletion) {
            completedCount++;
          }
        }
      }

      days.push({ date: dayStr, completedCount, totalScheduled });
    }

    return { days };
  }

  /**
   * Check if a given date is a scheduled day for a habit.
   */
  private isDayScheduled(
    date: Date,
    scheduleType: string,
    scheduledJsDays: number[]
  ): boolean {
    if (scheduleType === 'DAILY') {
      return true;
    }
    // WEEKLY: check if the day of week matches
    const dayOfWeek = date.getUTCDay();
    return scheduledJsDays.includes(dayOfWeek);
  }
}
