import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCallback, useSyncExternalStore } from 'react';
import api from '../services/api';
import type { AuthResponse } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';

// External store for auth state so all consumers re-render on change
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): boolean {
  return localStorage.getItem(AUTH_TOKEN_KEY) !== null;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      emitChange();
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<AuthResponse>('/auth/register', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      emitChange();
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      emitChange();
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      // Even on error, clear local state and redirect
      localStorage.removeItem(AUTH_TOKEN_KEY);
      emitChange();
      queryClient.clear();
      navigate('/login');
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    isAuthenticated,
    login: loginMutation.mutate,
    loginError: loginMutation.error,
    loginIsLoading: loginMutation.isPending,
    register: registerMutation.mutate,
    registerError: registerMutation.error,
    registerIsLoading: registerMutation.isPending,
    logout,
    logoutIsLoading: logoutMutation.isPending,
  };
}
