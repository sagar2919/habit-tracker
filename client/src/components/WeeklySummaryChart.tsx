import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../services/api';
import type { WeeklySummary } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ChartDataPoint {
  label: string;
  date: string;
  completed: number;
  scheduled: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function getWeekRangeLabel(days: { date: string }[]): string {
  if (days.length === 0) return '';
  const start = formatDate(days[0].date);
  const end = formatDate(days[days.length - 1].date);
  return `${start} – ${end}`;
}

export default function WeeklySummaryChart() {
  const { data, isLoading, isError } = useQuery<WeeklySummary>({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const response = await api.get<WeeklySummary>('/analytics/weekly-summary');
      return response.data;
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">Failed to load weekly summary.</p>
      </div>
    );
  }

  const days = data?.days ?? [];
  const weekRange = getWeekRangeLabel(days);

  const chartData: ChartDataPoint[] = days.map((day, index) => ({
    label: `${DAY_NAMES[index]}`,
    date: formatDate(day.date),
    completed: day.completedCount,
    scheduled: day.totalScheduled,
  }));

  const hasData = chartData.some((d) => d.scheduled > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No habits scheduled this week.</p>
      </div>
    );
  }

  // Calculate weekly consistency
  const totalScheduled = days.reduce((sum, d) => sum + d.totalScheduled, 0);
  const totalCompleted = days.reduce((sum, d) => sum + d.completedCount, 0);
  const weeklyRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 1000) / 10 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{weekRange}</p>
        <p className="text-sm font-medium text-indigo-600">{weeklyRate}% this week</p>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={({ x, y, payload, index }: { x: number; y: number; payload: { value: string }; index: number }) => (
                <g transform={`translate(${x},${y})`}>
                  <text x={0} y={0} dy={12} textAnchor="middle" fill="#374151" fontSize={12} fontWeight={500}>
                    {payload.value}
                  </text>
                  <text x={0} y={0} dy={26} textAnchor="middle" fill="#9ca3af" fontSize={10}>
                    {chartData[index]?.date ?? ''}
                  </text>
                </g>
              )}
              stroke="#6b7280"
              height={45}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => String(label).replace('\n', ' ')}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="scheduled"
              name="Scheduled"
              fill="#d1d5db"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
