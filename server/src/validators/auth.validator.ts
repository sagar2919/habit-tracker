import { z } from 'zod';

// ============================================================
// Email Validation
// ============================================================

/**
 * Email schema: validates format and normalizes to lowercase.
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .transform((email) => email.toLowerCase());

/**
 * Standalone email validation function for use in property tests.
 * Returns { success: true, data: normalizedEmail } or { success: false, error: string }.
 */
export function validateEmail(input: string): { success: true; data: string } | { success: false; error: string } {
  const result = emailSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message ?? 'Invalid email' };
}

// ============================================================
// Password Validation
// ============================================================

/**
 * Password schema: 8-128 chars, at least one uppercase, one lowercase, one digit.
 * Returns specific error messages indicating which rule failed.
 */
export const passwordSchema = z
  .string()
  .superRefine((password, ctx) => {
    if (password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at least 8 characters long',
      });
      return;
    }
    if (password.length > 128) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at most 128 characters long',
      });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must contain at least one uppercase letter',
      });
    }
    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must contain at least one lowercase letter',
      });
    }
    if (!/[0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must contain at least one digit',
      });
    }
  });

/**
 * Standalone password validation function for use in property tests.
 * Returns { success: true } or { success: false, errors: string[] }.
 */
export function validatePassword(input: string): { success: true } | { success: false; errors: string[] } {
  const result = passwordSchema.safeParse(input);
  if (result.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

// ============================================================
// Combined Registration Schema
// ============================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
