// Shared type definitions for the Habit Tracker server

// ============================================================
// Schedule Types
// ============================================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekly'; days: DayOfWeek[] }; // 1-7 days

// ============================================================
// Input Types
// ============================================================

export interface CreateHabitInput {
  name: string; // 1-100 chars after trim
  schedule: HabitSchedule;
}

export interface UpdateHabitInput {
  name?: string;
  schedule?: HabitSchedule;
}

// ============================================================
// Analytics Result Types
// ============================================================

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

export type TimeWindow = '7d' | '30d' | 'all';

export interface HeatmapEntry {
  date: string; // ISO date string
  level: 0 | 1 | 2 | 3 | 4; // 0%, 1-25%, 26-50%, 51-75%, 76-100%
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
// Service Interfaces
// ============================================================

export interface IAuthenticationService {
  register(email: string, password: string): Promise<{ user: { id: string; email: string }; token: string }>;
  login(email: string, password: string): Promise<{ user: { id: string; email: string }; token: string }>;
  logout(token: string): Promise<void>;
  validateToken(token: string): Promise<{ id: string; email: string } | null>;
}

export interface IHabitService {
  create(userId: string, data: CreateHabitInput): Promise<{ id: string; name: string; scheduleType: string; scheduleDays: string[]; userId: string; currentStreak: number; longestStreak: number; createdAt: Date; updatedAt: Date }>;
  update(userId: string, habitId: string, data: UpdateHabitInput): Promise<{ id: string; name: string; scheduleType: string; scheduleDays: string[]; userId: string; currentStreak: number; longestStreak: number; createdAt: Date; updatedAt: Date }>;
  delete(userId: string, habitId: string): Promise<void>;
  getAll(userId: string): Promise<{ id: string; name: string; scheduleType: string; scheduleDays: string[]; userId: string; currentStreak: number; longestStreak: number; createdAt: Date; updatedAt: Date }[]>;
  getById(userId: string, habitId: string): Promise<{ id: string; name: string; scheduleType: string; scheduleDays: string[]; userId: string; currentStreak: number; longestStreak: number; createdAt: Date; updatedAt: Date } | null>;
}

export interface ICompletionService {
  markComplete(userId: string, habitId: string, date: string): Promise<{ id: string; habitId: string; date: Date; createdAt: Date }>;
  unmarkComplete(userId: string, habitId: string, date: string): Promise<void>;
  getCompletions(habitId: string, startDate: string, endDate: string): Promise<{ id: string; habitId: string; date: Date; createdAt: Date }[]>;
}

export interface IAnalyticsEngine {
  calculateStreak(habitId: string): Promise<StreakResult>;
  calculateConsistency(habitId: string, window: TimeWindow): Promise<number>;
  getDashboardSummary(userId: string): Promise<DashboardSummary>;
  getHeatmapData(habitId: string): Promise<HeatmapEntry[]>;
  getWeeklySummary(userId: string): Promise<WeeklySummary>;
}
