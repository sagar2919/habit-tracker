import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import HabitForm from '../components/HabitForm';
import ConsistencyMetrics from '../components/ConsistencyMetrics';
import CalendarHeatmap from '../components/CalendarHeatmap';
import HabitHero from '../components/HabitHero';
import ConsistencyLineChart from '../components/ConsistencyLineChart';
import type { Habit, HabitSchedule, DayOfWeek } from '../types';

interface UpdateHabitPayload {
  name: string;
  schedule: { type: 'daily' } | { type: 'weekly'; days: string[] };
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const habitQuery = useQuery<Habit>({
    queryKey: ['habits', id],
    queryFn: async () => {
      const response = await api.get(`/habits/${id}`);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; schedule: HabitSchedule }) => {
      const payload: UpdateHabitPayload = {
        name: data.name,
        schedule: data.schedule,
      };
      const response = await api.put(`/habits/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/dashboard');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/dashboard');
    },
  });

  if (habitQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (habitQuery.isError || !habitQuery.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Habit not found or failed to load.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const habit = habitQuery.data;

  // Convert backend habit data to form values
  const initialValues = {
    name: habit.name,
    schedule: (habit.scheduleType === 'WEEKLY'
      ? { type: 'weekly' as const, days: habit.scheduleDays.map((d) => d.toLowerCase() as DayOfWeek) }
      : { type: 'daily' as const }) satisfies HabitSchedule,
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center min-h-[44px] min-w-[44px] text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Hero Section — Streak & Motivation */}
        <HabitHero habitId={id!} habitName={habit.name} />

        {/* Consistency Metrics */}
        <ConsistencyMetrics habitId={id!} />

        {/* Consistency Trend Line Chart */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Trend</h3>
          <ConsistencyLineChart habitId={id!} />
        </div>

        {/* Calendar Heatmap */}
        <div className="mt-6">
          <CalendarHeatmap habitId={id!} />
        </div>

        {/* Edit Habit */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Habit</h2>

        {updateMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {(updateMutation.error as Error)?.message || 'Failed to update habit. Please try again.'}
            </p>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {(deleteMutation.error as Error)?.message || 'Failed to delete habit. Please try again.'}
            </p>
          </div>
        )}

        <HabitForm
          onSubmit={(values) => updateMutation.mutate(values)}
          initialValues={initialValues}
          isLoading={updateMutation.isPending}
        />
        </div>

        {/* Delete Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Deleting a habit is permanent and cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending}
            className="min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            Delete Habit
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 id="delete-dialog-title" className="text-lg font-medium text-gray-900">
              Delete Habit
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure? This will permanently delete this habit and all completion records.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
