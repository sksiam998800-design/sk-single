import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

export type BadgeTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';

const TONE_MAP: Record<BadgeTone, string> = {
  blue: 'bg-blue-50 text-[#145CFF] dark:bg-blue-950/50 dark:text-blue-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
};

export function StatusBadge({ label, tone = 'slate' }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${TONE_MAP[tone]}`}>
      {label}
    </span>
  );
}

export function statusToTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (['published', 'active', 'approved', 'delivered', 'paid', 'resolved', 'completed'].includes(s)) return 'emerald';
  if (['pending', 'requested', 'draft', 'in_progress', 'open', 'packing', 'processing'].includes(s)) return 'amber';
  if (['shipped', 'confirmed', 'packed'].includes(s)) return 'blue';
  if (['cancelled', 'rejected', 'suspended', 'failed', 'error', 'archived'].includes(s)) return 'rose';
  if (['refunded', 'returned', 'return_requested'].includes(s)) return 'indigo';
  return 'slate';
}

export function EmptyStateCard({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF1FF] dark:bg-blue-950/50 text-[#145CFF]">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="font-display mt-3 text-base font-bold text-[#101B35] dark:text-white">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B] dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 shrink-0"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730]"
        />
      ))}
    </div>
  );
}
