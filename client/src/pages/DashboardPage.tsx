import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { DashboardSummary, DashboardHabit } from '../types';
import HabitCard from '../components/HabitCard';
import CompletionIndicator from '../components/CompletionIndicator';
import EmptyState from '../components/EmptyState';
import { useErrorToast } from '../hooks/useErrorToast';
import { getErrorMessage } from '../services/api';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showError } = useErrorToast();

  const {
    data: dashboard,
    isLoading,
    isError,
  } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardSummary>('/analytics/dashboard');
      return response.data;
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (habitId: string) => {
      await api.post(`/habits/${habitId}/completions`, { date: getTodayDate() });
    },
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previousDashboard = queryClient.getQueryData<DashboardSummary>(['dashboard']);

      queryClient.setQueryData<DashboardSummary>(['dashboard'], (old) => {
        if (!old) return old;
        const updatedHabits = old.habits.map((h) =>
          h.id === habitId
            ? { ...h, todayStatus: 'completed' as const, currentStreak: h.currentStreak + 1 }
            : h
        );
        const allCompletedToday = updatedHabits.every(
          (h) => h.todayStatus === 'completed' || h.todayStatus === 'not_scheduled'
        );
        return { habits: updatedHabits, allCompletedToday };
      });

      return { previousDashboard };
    },
    onError: (err, _habitId, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard'], context.previousDashboard);
      }
      showError(getErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    },
  });

  const unmarkCompleteMutation = useMutation({
    mutationFn: async (habitId: string) => {
      await api.delete(`/habits/${habitId}/completions/${getTodayDate()}`);
    },
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previousDashboard = queryClient.getQueryData<DashboardSummary>(['dashboard']);

      queryClient.setQueryData<DashboardSummary>(['dashboard'], (old) => {
        if (!old) return old;
        const updatedHabits = old.habits.map((h) =>
          h.id === habitId
            ? { ...h, todayStatus: 'incomplete' as const, currentStreak: Math.max(0, h.currentStreak - 1) }
            : h
        );
        const allCompletedToday = updatedHabits.every(
          (h) => h.todayStatus === 'completed' || h.todayStatus === 'not_scheduled'
        );
        return { habits: updatedHabits, allCompletedToday };
      });

      return { previousDashboard };
    },
    onError: (err, _habitId, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard'], context.previousDashboard);
      }
      showError(getErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    },
  });

  const handleToggleCompletion = (habitId: string, currentStatus: DashboardHabit['todayStatus']) => {
    if (currentStatus === 'not_scheduled') return;
    if (currentStatus === 'completed') {
      unmarkCompleteMutation.mutate(habitId);
    } else {
      markCompleteMutation.mutate(habitId);
    }
  };

  const handleCreateHabit = () => {
    navigate('/habits/new');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">Failed to load dashboard data.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const habits = dashboard?.habits ?? [];
  const allCompletedToday = dashboard?.allCompletedToday ?? false;

  if (habits.length === 0) {
    return <EmptyState onCreateHabit={handleCreateHabit} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today's Habits</h1>
        <button
          onClick={handleCreateHabit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px] min-w-[44px]"
        >
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
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Habit
        </button>
      </div>

      {/* Completion indicator */}
      {allCompletedToday && <CompletionIndicator />}

      {/* Habit list */}
      <div className="flex flex-col gap-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggleCompletion={handleToggleCompletion}
            isToggling={
              (markCompleteMutation.isPending && markCompleteMutation.variables === habit.id) ||
              (unmarkCompleteMutation.isPending && unmarkCompleteMutation.variables === habit.id)
            }
          />
        ))}
      </div>
    </div>
  );
}
