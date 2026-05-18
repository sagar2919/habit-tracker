import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { DashboardSummary, WeeklySummary } from '../types';
import WeeklySummaryChart from '../components/WeeklySummaryChart';

interface HabitAnalyticsData {
  consistency: { '7d': number; '30d': number; all: number };
  streak: { currentStreak: number; longestStreak: number };
}

function ConsistencyBadge({ value }: { value: number }) {
  const color = value > 75 ? 'text-green-700 bg-green-100' : value >= 50 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {value}%
    </span>
  );
}

function HabitAnalyticsRow({ habitId, habitName, todayStatus, currentStreak }: { habitId: string; habitName: string; todayStatus: string; currentStreak: number }) {
  const { data } = useQuery<HabitAnalyticsData>({
    queryKey: ['analytics', habitId],
    queryFn: async () => {
      const response = await api.get(`/habits/${habitId}/analytics`);
      return response.data;
    },
    staleTime: 0,
  });

  return (
    <Link
      to={`/habits/${habitId}`}
      className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-gray-50 transition-colors min-h-[44px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
            todayStatus === 'completed'
              ? 'bg-green-500'
              : todayStatus === 'incomplete'
              ? 'bg-yellow-500'
              : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-medium text-gray-900 truncate">{habitName}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {data ? (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400">7d:</span>
              <ConsistencyBadge value={data.consistency['7d']} />
              <span className="text-xs text-gray-400">30d:</span>
              <ConsistencyBadge value={data.consistency['30d']} />
            </div>
            <div className="sm:hidden">
              <ConsistencyBadge value={data.consistency['7d']} />
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
        <span className="text-xs text-gray-500 w-12 text-right">
          {currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}
        </span>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function AnalyticsPage() {
  const dashboardQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardSummary>('/analytics/dashboard');
      return response.data;
    },
    staleTime: 0,
  });

  const weeklySummaryQuery = useQuery<WeeklySummary>({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const response = await api.get<WeeklySummary>('/analytics/weekly-summary');
      return response.data;
    },
    staleTime: 0,
  });

  const habits = dashboardQuery.data?.habits ?? [];
  const weeklySummary = weeklySummaryQuery.data;

  // Calculate overall stats
  const totalHabits = habits.length;
  const totalCompletionsThisWeek = weeklySummary?.days.reduce(
    (sum, day) => sum + day.completedCount,
    0
  ) ?? 0;
  const totalScheduledThisWeek = weeklySummary?.days.reduce(
    (sum, day) => sum + day.totalScheduled,
    0
  ) ?? 0;
  const averageConsistency = totalScheduledThisWeek > 0
    ? Math.round((totalCompletionsThisWeek / totalScheduledThisWeek) * 1000) / 10
    : 0;

  // Today's date for context
  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">{todayLabel}</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Habits</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalHabits}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Weekly Consistency</p>
          <p className={`text-2xl font-bold mt-1 ${averageConsistency > 75 ? 'text-green-600' : averageConsistency >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {averageConsistency}%
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Completions This Week</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {totalCompletionsThisWeek}
            <span className="text-sm font-normal text-gray-400"> / {totalScheduledThisWeek}</span>
          </p>
        </div>
      </div>

      {/* Weekly Summary Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week</h2>
        <WeeklySummaryChart />
      </div>

      {/* Per-Habit Consistency Scores */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Habit Consistency</h2>
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
            <span>7-day</span>
            <span>30-day</span>
            <span>Streak</span>
          </div>
        </div>
        {habits.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No habits created yet. Create your first habit to see analytics.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {habits.map((habit) => (
              <HabitAnalyticsRow
                key={habit.id}
                habitId={habit.id}
                habitName={habit.name}
                todayStatus={habit.todayStatus}
                currentStreak={habit.currentStreak}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
