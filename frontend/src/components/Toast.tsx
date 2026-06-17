'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  details?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, details?: string) => void;
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

  const toast = useCallback((message: string, type: ToastType = 'info', details?: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type, details }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000); // give it more time if there's an error to copy
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const copyDetails = (e: React.MouseEvent, details: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(details);
    // Optionally update the toast message temporarily or just rely on native OS clipboard feedback
  };

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
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                background: c.bg, border: `1px solid ${c.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minWidth: 240, maxWidth: 380,
                animation: 'fadeIn 0.2s ease-out',
                pointerEvents: 'auto', cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: c.border, color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0
                }}>{c.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{t.message}</span>
              </div>
              
              {t.details && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={(e) => copyDetails(e, t.details!)}
                    style={{
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', padding: '4px 10px',
                      borderRadius: 4, fontSize: 11, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Full Error
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
