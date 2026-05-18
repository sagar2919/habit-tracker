import { useState, FormEvent } from 'react';
import type { HabitSchedule, DayOfWeek } from '../types';

interface HabitFormValues {
  name: string;
  schedule: HabitSchedule;
}

interface HabitFormProps {
  onSubmit: (values: HabitFormValues) => void;
  initialValues?: HabitFormValues;
  isLoading?: boolean;
}

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
];

export default function HabitForm({ onSubmit, initialValues, isLoading }: HabitFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly'>(
    initialValues?.schedule.type ?? 'daily'
  );
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(
    initialValues?.schedule.type === 'weekly' ? initialValues.schedule.days : []
  );
  const [errors, setErrors] = useState<{ name?: string; days?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean }>({});

  const isEditMode = !!initialValues;

  function validate(): boolean {
    const newErrors: { name?: string; days?: string } = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      newErrors.name = 'Habit name is required';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Habit name must be 100 characters or less';
    }

    if (scheduleType === 'weekly' && selectedDays.length === 0) {
      newErrors.days = 'Select at least one day of the week';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true });

    if (!validate()) return;

    const schedule: HabitSchedule =
      scheduleType === 'daily' ? { type: 'daily' } : { type: 'weekly', days: selectedDays };

    onSubmit({ name: name.trim(), schedule });
  }

  function handleNameBlur() {
    setTouched({ name: true });
    if (touched.name) {
      validate();
    }
  }

  function toggleDay(day: DayOfWeek) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    // Clear days error when a day is selected
    if (errors.days) {
      setErrors((prev) => ({ ...prev, days: undefined }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Habit Name */}
      <div>
        <label htmlFor="habit-name" className="block text-sm font-medium text-gray-700">
          Habit Name
        </label>
        <input
          id="habit-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (touched.name) {
              const trimmed = e.target.value.trim();
              if (!trimmed) {
                setErrors((prev) => ({ ...prev, name: 'Habit name is required' }));
              } else if (trimmed.length > 100) {
                setErrors((prev) => ({ ...prev, name: 'Habit name must be 100 characters or less' }));
              } else {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }
          }}
          onBlur={handleNameBlur}
          maxLength={100}
          placeholder="e.g., Morning meditation"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            errors.name && touched.name
              ? 'border-red-300 text-red-900 placeholder-red-300'
              : 'border-gray-300'
          }`}
          aria-invalid={!!(errors.name && touched.name)}
          aria-describedby={errors.name && touched.name ? 'habit-name-error' : undefined}
        />
        {errors.name && touched.name && (
          <p id="habit-name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">{name.trim().length}/100 characters</p>
      </div>

      {/* Schedule Type */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">Schedule</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule-type"
              value="daily"
              checked={scheduleType === 'daily'}
              onChange={() => setScheduleType('daily')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="text-sm text-gray-700">Daily</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule-type"
              value="weekly"
              checked={scheduleType === 'weekly'}
              onChange={() => setScheduleType('weekly')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="text-sm text-gray-700">Weekly</span>
          </label>
        </div>
      </fieldset>

      {/* Day of Week Checkboxes (shown only for weekly) */}
      {scheduleType === 'weekly' && (
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            Select days
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <label
                key={day.value}
                className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-md border cursor-pointer text-sm font-medium transition-colors ${
                  selectedDays.includes(day.value)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day.value)}
                  onChange={() => toggleDay(day.value)}
                  className="sr-only"
                  aria-label={day.label}
                />
                {day.short}
              </label>
            ))}
          </div>
          {errors.days && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.days}
            </p>
          )}
        </fieldset>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-[44px] flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading
          ? 'Saving...'
          : isEditMode
          ? 'Save Changes'
          : 'Create Habit'}
      </button>
    </form>
  );
}
