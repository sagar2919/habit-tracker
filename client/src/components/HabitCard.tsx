import { Link } from 'react-router-dom';
import type { DashboardHabit } from '../types';

interface HabitCardProps {
  habit: DashboardHabit;
  onToggleCompletion: (habitId: string, currentStatus: DashboardHabit['todayStatus']) => void;
  isToggling?: boolean;
}

export default function HabitCard({ habit, onToggleCompletion, isToggling }: HabitCardProps) {
  const { id, name, todayStatus, currentStreak } = habit;

  const isCompleted = todayStatus === 'completed';
  const isNotScheduled = todayStatus === 'not_scheduled';

  const cardClasses = isCompleted
    ? 'bg-green-50 border-green-200'
    : isNotScheduled
      ? 'bg-gray-50 border-gray-200'
      : 'bg-white border-gray-200';

  return (
    <div
      className={`border rounded-lg p-4 flex items-center gap-4 transition-colors ${cardClasses}`}
    >
      {/* Completion toggle */}
      <button
        onClick={() => onToggleCompletion(id, todayStatus)}
        disabled={isNotScheduled || isToggling}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors min-h-[44px] min-w-[44px] ${
          isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : isNotScheduled
              ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
              : 'border-gray-300 hover:border-indigo-400 cursor-pointer'
        } ${isToggling ? 'opacity-50' : ''}`}
        aria-label={
          isCompleted
            ? `Mark ${name} as incomplete`
            : isNotScheduled
              ? `${name} is not scheduled today`
              : `Mark ${name} as complete`
        }
      >
        {isCompleted && (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/habits/${id}`}
          className={`font-medium truncate block hover:text-indigo-600 transition-colors ${
            isNotScheduled ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {name}
        </Link>
        {isNotScheduled && (
          <p className="text-sm text-gray-400">Not scheduled today</p>
        )}
      </div>

      {/* Streak display */}
      <div
        className={`flex items-center gap-1 shrink-0 ${
          isNotScheduled ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        <span className="text-sm" aria-label={`Current streak: ${currentStreak} days`}>
          🔥 {currentStreak}
        </span>
      </div>
    </div>
  );
}
