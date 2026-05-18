import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface AnalyticsResponse {
  consistency: {
    '7d': number;
    '30d': number;
    all: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
  };
}

interface ConsistencyMetricsProps {
  habitId: string;
}

function getColorClass(value: number): string {
  if (value > 75) return 'text-green-600 bg-green-50 border-green-200';
  if (value >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export default function ConsistencyMetrics({ habitId }: ConsistencyMetricsProps) {
  const { data, isLoading, isError } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics', habitId],
    queryFn: async () => {
      const response = await api.get(`/habits/${habitId}/analytics`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Failed to load analytics data.</p>
      </div>
    );
  }

  const { consistency, streak } = data;

  // Show insufficient data message if all consistency values are 0
  const hasNoData = consistency['7d'] === 0 && consistency['30d'] === 0 && consistency.all === 0;
  if (hasNoData && streak.currentStreak === 0 && streak.longestStreak === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-sm text-gray-500">Insufficient data. Start completing this habit to see metrics.</p>
      </div>
    );
  }

  const consistencyCards = [
    { label: 'Last 7 days', value: consistency['7d'] },
    { label: 'Last 30 days', value: consistency['30d'] },
    { label: 'All time', value: consistency.all },
  ];

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Consistency</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {consistencyCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 text-center ${getColorClass(card.value)}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}%</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-medium text-gray-900 pt-2">Streaks</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-center">
          <p className="text-sm font-medium text-indigo-600">Current Streak</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
          <p className="text-sm font-medium text-purple-600">Longest Streak</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {streak.longestStreak} {streak.longestStreak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>
    </div>
  );
}
