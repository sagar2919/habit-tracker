// Frontend TypeScript type definitions for the Habit Tracker

// ============================================================
// Schedule Types (mirrors backend)
// ============================================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekly'; days: DayOfWeek[] };

// ============================================================
// Input Types (mirrors backend)
// ============================================================

export interface CreateHabitInput {
  name: string;
  schedule: HabitSchedule;
}

export interface UpdateHabitInput {
  name?: string;
  schedule?: HabitSchedule;
}

// ============================================================
// Analytics Types (mirrors backend)
// ============================================================

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

export type TimeWindow = '7d' | '30d' | 'all';

export interface HeatmapEntry {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface WeeklySummary {
  days: { date: string; completedCount: number; totalScheduled: number }[];
}

export interface DashboardHabit {
  id: string;
  name: string;
  schedule: HabitSchedule;
  todayStatus: 'completed' | 'incomplete' | 'not_scheduled';
  currentStreak: number;
}

export interface DashboardSummary {
  habits: DashboardHabit[];
  allCompletedToday: boolean;
}

// ============================================================
// Frontend-Specific Types
// ============================================================

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Habit {
  id: string;
  name: string;
  scheduleType: string;
  scheduleDays: DayOfWeek[];
  userId: string;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
}

export interface Completion {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export interface ConsistencyMetrics {
  last7Days: number;
  last30Days: number;
  allTime: number;
}

export interface HabitAnalytics {
  streak: StreakResult;
  consistency: ConsistencyMetrics;
}
