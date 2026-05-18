import { useState, useCallback, type ReactNode } from 'react';
import { ErrorToastContext, type ToastState, type ToastType } from '../hooks/useErrorToast';
import ErrorToast from './ErrorToast';

let nextId = 0;

interface ErrorToastProviderProps {
  children: ReactNode;
}

export default function ErrorToastProvider({ children }: ErrorToastProviderProps) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = useCallback((message: string, type: ToastType, retryFn?: () => void) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type, retryFn, visible: true }]);
  }, []);

  const showError = useCallback(
    (message: string, retryFn?: () => void) => {
      addToast(message, 'error', retryFn);
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      addToast(message, 'warning');
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string) => {
      addToast(message, 'info');
    },
    [addToast]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ErrorToastContext.Provider value={{ toasts, showError, showWarning, showInfo, dismiss }}>
      {children}
      {/* Toast container - fixed top-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ErrorToast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  );
}
