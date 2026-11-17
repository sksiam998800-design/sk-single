import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchFilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  actions,
}: SearchFilterBarProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 pl-9 pr-3 text-xs text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#145CFF] focus:outline-none"
            />
          </div>
        )}
        {filters}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
