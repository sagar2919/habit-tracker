import { createContext, useContext } from 'react';

export type ToastType = 'error' | 'warning' | 'info';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  retryFn?: () => void;
  visible: boolean;
}

export interface ErrorToastContextValue {
  toasts: ToastState[];
  showError: (message: string, retryFn?: () => void) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  dismiss: (id: number) => void;
}

export const ErrorToastContext = createContext<ErrorToastContextValue | null>(null);

export function useErrorToast(): ErrorToastContextValue {
  const context = useContext(ErrorToastContext);
  if (!context) {
    throw new Error('useErrorToast must be used within an ErrorToastProvider');
  }
  return context;
}
