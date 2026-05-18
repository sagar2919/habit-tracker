import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';
import type { HeatmapEntry } from '../types';

interface CalendarHeatmapProps {
  habitId: string;
}

const LEVEL_COLORS = [
  'bg-gray-200',       // level 0 - no completions
  'bg-green-200',      // level 1 - 1-25%
  'bg-green-400',      // level 2 - 26-50%
  'bg-green-600',      // level 3 - 51-75%
  'bg-emerald-700',    // level 4 - 76-100%
];

const LEVEL_LABELS = [
  'No activity',
  '1–25%',
  '26–50%',
  '51–75%',
  '76–100%',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface CellData {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  dayOfWeek: number; // 0=Mon, 6=Sun
  weekIndex: number;
}

function buildGrid(entries: HeatmapEntry[]): { cells: CellData[]; weekCount: number; monthLabels: { label: string; weekIndex: number }[] } {
  const entryMap = new Map<string, 0 | 1 | 2 | 3 | 4>();
  for (const entry of entries) {
    entryMap.set(entry.date, entry.level);
  }

  // Calculate date range: last 12 months ending today
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(startDate.getDate() + 1);

  // Align start to Monday
  const gridStart = getMonday(startDate);
  // End on the Sunday of the current week
  const gridEnd = new Date(today);
  const endDay = gridEnd.getDay();
  if (endDay !== 0) {
    gridEnd.setDate(gridEnd.getDate() + (7 - endDay));
  }

  const cells: CellData[] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  const monthsSeen = new Set<string>();

  let weekIndex = 0;
  const current = new Date(gridStart);

  while (current <= gridEnd) {
    const dayOfWeek = (current.getDay() + 6) % 7; // Convert: 0=Mon, 6=Sun
    const dateStr = formatDate(current);
    const level = entryMap.get(dateStr) ?? 0;

    // Track month labels
    const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
    if (!monthsSeen.has(monthKey) && dayOfWeek === 0) {
      const monthName = current.toLocaleString('default', { month: 'short' });
      monthLabels.push({ label: monthName, weekIndex });
      monthsSeen.add(monthKey);
    }

    cells.push({ date: dateStr, level, dayOfWeek, weekIndex });

    current.setDate(current.getDate() + 1);
    if (dayOfWeek === 6) {
      weekIndex++;
    }
  }

  return { cells, weekCount: weekIndex + 1, monthLabels };
}

export default function CalendarHeatmap({ habitId }: CalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; level: number; x: number; y: number } | null>(null);

  const heatmapQuery = useQuery<HeatmapEntry[]>({
    queryKey: ['heatmap', habitId],
    queryFn: async () => {
      const response = await api.get(`/habits/${habitId}/heatmap`);
      return response.data;
    },
  });

  if (heatmapQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (heatmapQuery.isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">Failed to load heatmap data.</p>
      </div>
    );
  }

  const entries = heatmapQuery.data ?? [];

  // Show message if fewer than 7 entries
  if (entries.length < 7) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Heatmap</h3>
        <p className="text-sm text-gray-600">
          Insufficient data for chart. Track this habit for at least 7 days to see your progress.
        </p>
      </div>
    );
  }

  const { cells, weekCount, monthLabels } = buildGrid(entries);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Heatmap</h3>

      {/* Month labels */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex ml-8 mb-1">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-xs text-gray-500"
                style={{
                  position: 'relative',
                  left: `${m.weekIndex * 14}px`,
                  marginRight: i < monthLabels.length - 1
                    ? `${(monthLabels[i + 1].weekIndex - m.weekIndex) * 14 - 30}px`
                    : '0px',
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col justify-between pr-1" style={{ height: `${7 * 14}px` }}>
              {DAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="text-xs text-gray-500 leading-none"
                  style={{ height: '12px', display: i % 2 === 0 ? 'block' : 'none' }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Heatmap cells */}
            <div
              className="relative"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(7, 12px)`,
                gridTemplateColumns: `repeat(${weekCount}, 12px)`,
                gap: '2px',
              }}
            >
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${LEVEL_COLORS[cell.level]} cursor-pointer transition-opacity hover:opacity-80`}
                  style={{
                    gridRow: cell.dayOfWeek + 1,
                    gridColumn: cell.weekIndex + 1,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      date: cell.date,
                      level: cell.level,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  aria-label={`${cell.date}: ${LEVEL_LABELS[cell.level]}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-medium">{tooltip.date}</div>
          <div>{LEVEL_LABELS[tooltip.level]}</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1 mt-4 text-xs text-gray-600">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${color}`}
            title={LEVEL_LABELS[i]}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
