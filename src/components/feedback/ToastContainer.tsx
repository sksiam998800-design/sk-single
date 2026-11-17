import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { dismissToast, type ToastMessage } from '../../features/notifications/toastSlice';

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.durationMs);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
      return;
    }

    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      dispatch(dismissToast(toast.id));
    }, remainingRef.current);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, dispatch, toast.id]);

  const variantStyles = {
    success: {
      container: 'border-emerald-200 bg-white text-[#0F1D3A]',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
      bar: 'bg-emerald-500',
    },
    error: {
      container: 'border-rose-200 bg-white text-[#0F1D3A]',
      icon: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
      bar: 'bg-rose-500',
    },
    warning: {
      container: 'border-amber-200 bg-white text-[#0F1D3A]',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
      bar: 'bg-amber-500',
    },
    info: {
      container: 'border-blue-200 bg-white text-[#0F1D3A]',
      icon: <Info className="h-5 w-5 text-[#1155EE] shrink-0" />,
      bar: 'bg-[#1155EE]',
    },
  }[toast.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`relative overflow-hidden rounded-xl border shadow-lg transition-transform duration-150 ${variantStyles.container}`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 pr-10">
        {variantStyles.icon}
        <div className="min-w-0 flex-1">
          {toast.title && <p className="text-xs font-semibold tracking-tight text-[#0F1D3A]">{toast.title}</p>}
          <p className="text-sm leading-snug text-[#334155]">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(dismissToast(toast.id))}
          aria-label="Dismiss notification"
          className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-[#1155EE]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Mandatory animated right-to-left progress bar (4s default) */}
      <div className="h-1 w-full bg-slate-100">
        <div
          className={`h-full w-full novara-toast-progress ${variantStyles.bar}`}
          style={{
            animationDuration: `${toast.durationMs}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppSelector((s) => s.toast.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
