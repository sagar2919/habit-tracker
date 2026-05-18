import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import type { HeatmapEntry, Habit } from '../types';

interface ConsistencyLineChartProps {
  habitId: string;
}

interface WeekDataPoint {
  week: string;
  consistency: number;
}

/**
 * Calculates weekly consistency data from heatmap entries.
 * Groups entries into weeks and calculates the percentage of completed days per week.
 * Shows data for the past 12 weeks.
 */
function calculateWeeklyConsistency(entries: HeatmapEntry[]): WeekDataPoint[] {
  if (entries.length === 0) return [];

  // Sort entries by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Group entries into ISO weeks (Mon-Sun)
  const weekMap = new Map<string, { completed: number; total: number }>();

  for (const entry of sorted) {
    const date = new Date(entry.date + 'T00:00:00Z');
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { completed: 0, total: 0 });
    }

    const week = weekMap.get(weekKey)!;
    week.total++;
    if (entry.level > 0) {
      week.completed++;
    }
  }

  // Convert to array and take last 12 weeks
  const allWeeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);

  return allWeeks.map(([weekKey, data]) => {
    const consistency = data.total > 0
      ? Math.round((data.completed / data.total) * 1000) / 10
      : 0;

    // Format week label as "MMM DD"
    const date = new Date(weekKey + 'T00:00:00Z');
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    return { week: label, consistency };
  });
}

/**
 * Gets the Monday of the week for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export default function ConsistencyLineChart({ habitId }: ConsistencyLineChartProps) {
  // Fetch habit details to check creation date
  const habitQuery = useQuery<Habit>({
    queryKey: ['habits', habitId],
    queryFn: async () => {
      const response = await api.get(`/habits/${habitId}`);
      return response.data;
    },
  });

  // Fetch heatmap data to derive weekly consistency
  const heatmapQuery = useQuery<HeatmapEntry[]>({
    queryKey: ['heatmap', habitId],
    queryFn: async () => {
      const response = await api.get<HeatmapEntry[]>(`/habits/${habitId}/heatmap`);
      return response.data;
    },
    enabled: !!habitId,
  });

  if (habitQuery.isLoading || heatmapQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (habitQuery.isError || heatmapQuery.isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">Failed to load consistency data.</p>
      </div>
    );
  }

  // Check if habit has fewer than 7 days of history
  const habit = habitQuery.data;
  if (habit) {
    const createdAt = new Date(habit.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation < 7) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm text-gray-600 font-medium">Insufficient data</p>
          <p className="text-xs text-gray-500 mt-1">
            At least 7 days of history are needed to display this chart.
          </p>
        </div>
      );
    }
  }

  const entries = heatmapQuery.data ?? [];
  const weeklyData = calculateWeeklyConsistency(entries);

  if (weeklyData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No data available yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Consistency']}
          />
          <Line
            type="monotone"
            dataKey="consistency"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
