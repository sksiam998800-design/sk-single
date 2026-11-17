import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import type { AuditLogRecord, SystemLogRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function SystemLogsPage() {
  useSeoMeta({ title: 'System & Runtime Logs | NOVARA Admin', noIndex: true });

  const [tab, setTab] = useState<'all' | 'system' | 'audit'>('all');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; auditLogs: AuditLogRecord[]; systemLogs: SystemLogRecord[] }>(
        `/api/admin/logs?type=${tab}`,
      );
      setAuditLogs(res.auditLogs || []);
      setSystemLogs(res.systemLogs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load system logs.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const q = search.trim().toLowerCase();

  const filteredSystemLogs = useMemo(() => {
    return systemLogs.filter((l) => {
      if (levelFilter && l.level !== levelFilter) return false;
      if (!q) return true;
      return `${l.level} ${l.source} ${l.message}`.toLowerCase().includes(q);
    });
  }, [systemLogs, levelFilter, q]);

  const filteredAuditLogs = useMemo(() => {
    if (!q) return auditLogs;
    return auditLogs.filter((l) =>
      `${l.actorName} ${l.action} ${l.resourceType} ${l.summary}`.toLowerCase().includes(q),
    );
  }, [auditLogs, q]);

  return (
    <AdminLayout>
      <PermissionGuard permission="logs.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="System Logs"
            subtitle="Inspect server runtime diagnostics, integration warnings, error events, and correlated admin activity."
            breadcrumbs={[{ label: 'Admin & Roles' }, { label: 'System Logs' }]}
            actions={
              <button
                type="button"
                onClick={loadLogs}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
              </button>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search log message, source, actor, or action..."
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-0.5">
                  {(['all', 'system', 'audit'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                        tab === t
                          ? 'bg-[#145CFF] text-white'
                          : 'text-[#64748B] dark:text-slate-300 hover:text-[#101B35]'
                      }`}
                    >
                      {t === 'all' ? 'All Logs' : t === 'system' ? 'System Events' : 'Audit Trail'}
                    </button>
                  ))}
                </div>

                {tab !== 'audit' && (
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    aria-label="Filter by severity level"
                    className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs text-[#101B35] dark:text-slate-100"
                  >
                    <option value="">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                )}
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadLogs} />}

          {(tab === 'all' || tab === 'system') && (
            <div className="space-y-2">
              <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white px-1">
                System &amp; Runtime Event Logs
              </h2>
              <DataTable<SystemLogRecord>
                rows={filteredSystemLogs}
                rowKey={(l) => l.id}
                loading={loading}
                emptyState={
                  <EmptyStateCard
                    icon={<Terminal className="h-6 w-6" />}
                    title="No system runtime events recorded"
                    description="Server warnings, integration faults, and operational events will appear here."
                  />
                }
                columns={[
                  {
                    key: 'level',
                    header: 'Level',
                    render: (l) => <StatusBadge label={l.level} tone={statusToTone(l.level)} />,
                  },
                  {
                    key: 'source',
                    header: 'Source',
                    render: (l) => (
                      <span className="font-mono-tabular font-semibold text-[#101B35] dark:text-slate-200">
                        {l.source}
                      </span>
                    ),
                  },
                  {
                    key: 'message',
                    header: 'Message',
                    render: (l) => (
                      <span className="text-xs text-[#64748B] dark:text-slate-300">{l.message}</span>
                    ),
                  },
                  {
                    key: 'createdAt',
                    header: 'Timestamp',
                    align: 'right',
                    render: (l) => (
                      <span className="font-mono-tabular text-[11px] text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {(tab === 'all' || tab === 'audit') && (
            <div className="space-y-2">
              <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white px-1">
                Correlated Administrative Audit Trail
              </h2>
              <DataTable<AuditLogRecord>
                rows={filteredAuditLogs}
                rowKey={(l) => l.id}
                loading={loading}
                emptyState={
                  <EmptyStateCard
                    icon={<Terminal className="h-6 w-6" />}
                    title="No audit events recorded"
                    description="Administrative actions will show up here for correlation."
                  />
                }
                columns={[
                  {
                    key: 'actor',
                    header: 'Actor',
                    render: (l) => <span className="font-semibold text-[#101B35] dark:text-white">{l.actorName}</span>,
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    render: (l) => <span className="font-mono-tabular font-semibold text-[#145CFF]">{l.action}</span>,
                  },
                  {
                    key: 'summary',
                    header: 'Summary',
                    render: (l) => <span className="text-xs text-[#64748B] dark:text-slate-300">{l.summary}</span>,
                  },
                  {
                    key: 'createdAt',
                    header: 'Timestamp',
                    align: 'right',
                    render: (l) => (
                      <span className="font-mono-tabular text-[11px] text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
