import axios, { type AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout per requirement 13.5
});

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 (clear auth + redirect)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a user-friendly error message from an Axios error.
 * Handles: 403, 400, 500, timeout, and network errors.
 */
export function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Something went wrong. Please try again.';
  }

  const axiosError = error as AxiosError<{ error?: string; message?: string }>;

  // Network error (no response received)
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }

  const status = axiosError.response.status;
  const data = axiosError.response.data;

  switch (status) {
    case 403:
      return 'Access denied. You don\'t have permission to perform this action.';
    case 400:
      return data?.message || 'Invalid request. Please check your input.';
    case 404:
      return data?.message || 'The requested resource was not found.';
    case 409:
      return data?.message || 'A conflict occurred. The operation could not be completed.';
    case 423:
      return data?.message || 'Account is temporarily locked. Please try again later.';
    case 504:
      return 'Request timed out. Please try again.';
    case 500:
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Determines if an error is retryable (network/timeout/server errors).
 */
export function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const axiosError = error as AxiosError;

  // Network errors and timeouts are retryable
  if (!axiosError.response) return true;

  const status = axiosError.response.status;
  // 500 and 504 are retryable
  return status >= 500;
}

export default api;
