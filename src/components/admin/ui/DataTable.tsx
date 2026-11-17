import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
  render: (row: T) => ReactNode;
}

export interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pagination?: DataTablePagination | null;
  onPageChange?: (page: number) => void;
  bulkActions?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyState,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pagination,
  onPageChange,
  bulkActions,
}: DataTableProps<T>) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(rowKey(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(rows.map((r) => rowKey(r)));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 shadow-xs overflow-hidden">
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EAF5] dark:border-slate-800 bg-[#EAF1FF]/70 dark:bg-blue-950/30 px-4 py-2.5 text-xs">
          <span className="font-semibold text-[#145CFF]">
            {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-[#0F1D3A] text-[#64748B] dark:text-slate-300">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#145CFF] focus:ring-[#145CFF]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.widthClass || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skel-${idx}`}>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-3.5">
                    <div className="h-5 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-10 text-center">
                  {emptyState || (
                    <p className="text-xs text-[#64748B] dark:text-slate-400">No records match your current criteria.</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                const checked = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className={`transition-colors hover:bg-[#F4F7FF]/70 dark:hover:bg-slate-800/40 ${
                      checked ? 'bg-[#EAF1FF]/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#145CFF] focus:ring-[#145CFF]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF5] dark:border-slate-800 px-4 py-3 text-xs text-[#64748B] dark:text-slate-400">
          <span>
            Showing page <strong className="text-[#101B35] dark:text-white">{pagination.page}</strong> of{' '}
            <strong className="text-[#101B35] dark:text-white">{pagination.totalPages}</strong> ({pagination.total}{' '}
            total)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
