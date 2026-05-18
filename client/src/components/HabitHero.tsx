import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface HabitHeroProps {
  habitId: string;
  habitName: string;
}

interface AnalyticsData {
  consistency: { '7d': number; '30d': number; all: number };
  streak: { currentStreak: number; longestStreak: number };
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function getNextMilestone(current: number): number {
  return MILESTONES.find((m) => m > current) ?? current + 50;
}

function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '🏆';
  if (streak >= 50) return '⭐';
  if (streak >= 30) return '💎';
  if (streak >= 21) return '🚀';
  if (streak >= 14) return '💪';
  if (streak >= 7) return '🔥';
  if (streak >= 3) return '✨';
  return '🌱';
}

function getMotivationalMessage(streak: number, consistency: number): string {
  if (streak >= 30) return "You're unstoppable! A full month of consistency.";
  if (streak >= 21) return "21 days — they say it takes this long to form a habit. You did it!";
  if (streak >= 14) return "Two weeks strong! You're building real momentum.";
  if (streak >= 7) return "One full week! Keep this energy going.";
  if (streak >= 3) return "Three days in a row — the hardest part is starting!";
  if (streak >= 1) return "Great start! Every journey begins with a single step.";
  if (consistency > 50) return "You've been consistent overall. Get back on track today!";
  return "Today is a fresh start. You've got this!";
}

function ProgressRing({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color = percentage > 75 ? '#22c55e' : percentage >= 50 ? '#eab308' : percentage > 0 ? '#f97316' : '#d1d5db';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export default function HabitHero({ habitId, habitName }: HabitHeroProps) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', habitId],
    queryFn: async () => {
      const response = await api.get(`/habits/${habitId}/analytics`);
      return response.data;
    },
    staleTime: 0,
  });

  if (isLoading || !data) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 animate-pulse">
        <div className="h-32" />
      </div>
    );
  }

  const { streak, consistency } = data;
  const nextMilestone = getNextMilestone(streak.currentStreak);
  const milestoneProgress = Math.min((streak.currentStreak / nextMilestone) * 100, 100);
  const emoji = getStreakEmoji(streak.currentStreak);
  const message = getMotivationalMessage(streak.currentStreak, consistency.all);

  // Check if user just hit a milestone
  const isAtMilestone = MILESTONES.includes(streak.currentStreak) && streak.currentStreak > 0;

  return (
    <div className={`rounded-xl p-6 mb-6 ${isAtMilestone ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'}`}>
      {/* Milestone celebration */}
      {isAtMilestone && (
        <div className="text-center mb-4 animate-bounce">
          <p className="text-lg font-bold text-yellow-700">🎉 Milestone Reached! 🎉</p>
          <p className="text-sm text-yellow-600">{streak.currentStreak} day streak!</p>
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Progress Ring */}
        <div className="relative shrink-0">
          <ProgressRing percentage={milestoneProgress} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl">{emoji}</span>
            <span className="text-xl font-bold text-gray-900">{streak.currentStreak}</span>
            <span className="text-xs text-gray-500">days</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{habitName}</h2>
          <p className="text-sm text-gray-600 mt-1">{message}</p>

          {/* Next milestone */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Next milestone: {nextMilestone} days</span>
              <span>{nextMilestone - streak.currentStreak} to go</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Best</p>
              <p className="text-sm font-semibold text-purple-600">{streak.longestStreak}d</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">7-day</p>
              <p className="text-sm font-semibold text-indigo-600">{consistency['7d']}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">All time</p>
              <p className="text-sm font-semibold text-green-600">{consistency.all}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
