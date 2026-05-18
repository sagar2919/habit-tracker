import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '../auth.validator.js';
import { validateHabitName, validateSchedule, validateCreateHabit } from '../habit.validator.js';
import { validateCompletionDate } from '../completion.validator.js';

describe('Auth Validators', () => {
  describe('validateEmail', () => {
    it('accepts a valid email and normalizes to lowercase', () => {
      const result = validateEmail('User@Example.COM');
      expect(result).toEqual({ success: true, data: 'user@example.com' });
    });

    it('rejects an invalid email format', () => {
      const result = validateEmail('not-an-email');
      expect(result.success).toBe(false);
    });

    it('rejects an empty string', () => {
      const result = validateEmail('');
      expect(result.success).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('accepts a valid password', () => {
      const result = validatePassword('Abcdef1x');
      expect(result).toEqual({ success: true });
    });

    it('rejects a password shorter than 8 characters', () => {
      const result = validatePassword('Ab1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Password must be at least 8 characters long');
      }
    });

    it('rejects a password longer than 128 characters', () => {
      const result = validatePassword('A'.repeat(129));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Password must be at most 128 characters long');
      }
    });

    it('rejects a password without uppercase', () => {
      const result = validatePassword('abcdefg1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      }
    });

    it('rejects a password without lowercase', () => {
      const result = validatePassword('ABCDEFG1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      }
    });

    it('rejects a password without a digit', () => {
      const result = validatePassword('Abcdefgh');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Password must contain at least one digit');
      }
    });

    it('accepts a password at exactly 8 characters', () => {
      const result = validatePassword('Abcdef1x');
      expect(result).toEqual({ success: true });
    });

    it('accepts a password at exactly 128 characters', () => {
      const pw = 'Aa1' + 'x'.repeat(125);
      const result = validatePassword(pw);
      expect(result).toEqual({ success: true });
    });
  });
});

describe('Habit Validators', () => {
  describe('validateHabitName', () => {
    it('accepts a valid name and trims whitespace', () => {
      const result = validateHabitName('  Exercise  ');
      expect(result).toEqual({ success: true, data: 'Exercise' });
    });

    it('rejects an empty string', () => {
      const result = validateHabitName('');
      expect(result.success).toBe(false);
    });

    it('rejects a whitespace-only string', () => {
      const result = validateHabitName('   ');
      expect(result.success).toBe(false);
    });

    it('rejects a name longer than 100 characters after trim', () => {
      const result = validateHabitName('a'.repeat(101));
      expect(result.success).toBe(false);
    });

    it('accepts a name at exactly 100 characters', () => {
      const result = validateHabitName('a'.repeat(100));
      expect(result.success).toBe(true);
    });
  });

  describe('validateSchedule', () => {
    it('accepts a daily schedule', () => {
      const result = validateSchedule({ type: 'daily' });
      expect(result).toEqual({ success: true, data: { type: 'daily' } });
    });

    it('accepts a weekly schedule with valid days', () => {
      const result = validateSchedule({ type: 'weekly', days: ['monday', 'friday'] });
      expect(result).toEqual({ success: true, data: { type: 'weekly', days: ['monday', 'friday'] } });
    });

    it('rejects a weekly schedule with no days', () => {
      const result = validateSchedule({ type: 'weekly', days: [] });
      expect(result.success).toBe(false);
    });

    it('rejects a weekly schedule with invalid day names', () => {
      const result = validateSchedule({ type: 'weekly', days: ['funday'] });
      expect(result.success).toBe(false);
    });

    it('rejects a weekly schedule with duplicate days', () => {
      const result = validateSchedule({ type: 'weekly', days: ['monday', 'monday'] });
      expect(result.success).toBe(false);
    });

    it('accepts a weekly schedule with all 7 days', () => {
      const result = validateSchedule({
        type: 'weekly',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid schedule type', () => {
      const result = validateSchedule({ type: 'monthly' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCreateHabit', () => {
    it('accepts a valid habit with daily schedule', () => {
      const result = validateCreateHabit({ name: 'Read', schedule: { type: 'daily' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Read');
        expect(result.data.schedule).toEqual({ type: 'daily' });
      }
    });

    it('rejects a habit with empty name and no schedule', () => {
      const result = validateCreateHabit({ name: '', schedule: null });
      expect(result.success).toBe(false);
    });
  });
});

describe('Completion Validators', () => {
  describe('validateCompletionDate', () => {
    const referenceDate = new Date('2024-06-15T12:00:00.000Z');

    it('accepts today', () => {
      const result = validateCompletionDate('2024-06-15', referenceDate);
      expect(result).toEqual({ success: true, data: '2024-06-15' });
    });

    it('accepts 7 days ago (inclusive)', () => {
      const result = validateCompletionDate('2024-06-08', referenceDate);
      expect(result).toEqual({ success: true, data: '2024-06-08' });
    });

    it('rejects 8 days ago', () => {
      const result = validateCompletionDate('2024-06-07', referenceDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Completion date cannot be more than 7 days in the past');
      }
    });

    it('rejects a future date', () => {
      const result = validateCompletionDate('2024-06-16', referenceDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Completion date cannot be in the future');
      }
    });

    it('rejects an invalid date format', () => {
      const result = validateCompletionDate('06/15/2024', referenceDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Date must be in YYYY-MM-DD format');
      }
    });

    it('rejects an invalid date value', () => {
      const result = validateCompletionDate('2024-13-45', referenceDate);
      expect(result.success).toBe(false);
    });

    it('accepts yesterday', () => {
      const result = validateCompletionDate('2024-06-14', referenceDate);
      expect(result).toEqual({ success: true, data: '2024-06-14' });
    });
  });
});
