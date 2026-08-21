import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import type { AlertTone } from '@/components/ui/InlineAlert';

export type ToastInput = {
  tone?: AlertTone;
  title: string;
  description?: string;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: string; tone: AlertTone };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
} as const;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        tone: input.tone ?? 'info',
        title: input.title,
        description: input.description,
        durationMs: input.durationMs ?? 4200,
      };
      setToasts((prev) => [...prev.slice(-3), item]);
      window.setTimeout(() => dismiss(id), item.durationMs);
    },
    [dismiss]
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: 'success', title, description }),
      error: (title, description) => toast({ tone: 'error', title, description }),
      info: (title, description) => toast({ tone: 'info', title, description }),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="ui-toast-viewport" aria-live="polite" aria-relevant="additions">
              {toasts.map((t) => {
                const Icon = ICONS[t.tone];
                return (
                  <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role="status">
                    <span className={`ui-toast__icon ui-toast__icon--${t.tone}`} aria-hidden>
                      <Icon className="w-4 h-4" strokeWidth={2.25} />
                    </span>
                    <div className="ui-toast__body min-w-0">
                      <p className="ui-toast__title">{t.title}</p>
                      {t.description ? <p className="ui-toast__desc">{t.description}</p> : null}
                    </div>
                    <button
                      type="button"
                      className="ui-toast__close"
                      onClick={() => dismiss(t.id)}
                      aria-label="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
