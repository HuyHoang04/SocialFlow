'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const COLOR: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'var(--success-bg)',  border: 'var(--success)',  color: 'var(--success)',  icon: '✓' },
  error:   { bg: 'var(--error-bg)',    border: 'var(--error)',    color: 'var(--error)',    icon: '✕' },
  info:    { bg: 'var(--accent-glow)', border: 'var(--accent)',   color: 'var(--accent)',   icon: 'ℹ' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none'
      }}>
        {toasts.map(t => {
          const c = COLOR[t.type];
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                background: c.bg, border: `1px solid ${c.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minWidth: 240, maxWidth: 380,
                animation: 'fadeIn 0.2s ease-out',
                pointerEvents: 'auto', cursor: 'pointer'
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: c.border, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0
              }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
