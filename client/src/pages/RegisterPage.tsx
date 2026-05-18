import { FormEvent, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AxiosError } from 'axios';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'At least one uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'At least one digit', test: (pw) => /\d/.test(pw) },
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const { register, registerError, registerIsLoading } = useAuth();

  const ruleResults = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  const allRulesPassed = ruleResults.every((r) => r.passed);

  function getErrorMessage(error: unknown): string | null {
    if (!error) return null;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status === 409) {
        return 'Email already in use';
      }
      const data = error.response?.data as { fields?: Array<{ field: string; message: string }> } | undefined;
      if (status === 400 && data?.fields) {
        return data.fields.map((f) => f.message).join('. ');
      }
    }
    return 'Registration failed. Please try again.';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!allRulesPassed) return;
    register({ email, password });
  }

  const errorMessage = getErrorMessage(registerError);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 text-center">
        Create Account
      </h2>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setTouched(true);
          }}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {touched && (
          <ul className="mt-2 space-y-1">
            {ruleResults.map((rule) => (
              <li
                key={rule.label}
                className={`text-xs flex items-center gap-1 ${
                  rule.passed ? 'text-green-600' : 'text-red-500'
                }`}
              >
                <span>{rule.passed ? '✓' : '✗'}</span>
                <span>{rule.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={registerIsLoading}
        className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {registerIsLoading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
