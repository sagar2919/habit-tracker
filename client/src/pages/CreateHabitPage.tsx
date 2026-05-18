import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import HabitForm from '../components/HabitForm';
import type { HabitSchedule } from '../types';

interface CreateHabitPayload {
  name: string;
  schedule: { type: 'daily' } | { type: 'weekly'; days: string[] };
}

export default function CreateHabitPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; schedule: HabitSchedule }) => {
      const payload: CreateHabitPayload = {
        name: data.name,
        schedule: data.schedule,
      };
      const response = await api.post('/habits', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/dashboard');
    },
  });

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

      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Habit</h1>

        {createMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {(createMutation.error as Error)?.message || 'Failed to create habit. Please try again.'}
            </p>
          </div>
        )}

        <HabitForm
          onSubmit={(values) => createMutation.mutate(values)}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
