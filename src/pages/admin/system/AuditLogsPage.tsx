import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSearch, RefreshCw } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
} from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import type { AuditLogRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function AuditLogsPage() {
  useSeoMeta({ title: 'Audit Logs | NOVARA Admin', noIndex: true });

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; logs: AuditLogRecord[] }>('/api/admin/audit-logs');
      setLogs(res.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const resourceTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.resourceType) set.add(l.resourceType);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (resourceFilter && l.resourceType !== resourceFilter) return false;
      if (!q) return true;
      return `${l.actorName} ${l.actorEmail || ''} ${l.action} ${l.resourceType} ${l.summary}`
        .toLowerCase()
        .includes(q);
    });
  }, [logs, resourceFilter, search]);

  return (
    <AdminLayout>
      <PermissionGuard permission="audit.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Audit Logs"
            subtitle="Immutable trail of administrative mutations across products, orders, settings, staff, and CMS."
            breadcrumbs={[{ label: 'Admin & Roles' }, { label: 'Audit Logs' }]}
            actions={
              <button
                type="button"
                onClick={loadAuditLogs}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search actor, action, resource, or summary..."
            filters={
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                aria-label="Filter by resource type"
                className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs text-[#101B35] dark:text-slate-100"
              >
                <option value="">All Resources</option>
                {resourceTypes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadAuditLogs} />}

          <DataTable<AuditLogRecord>
            rows={filteredLogs}
            rowKey={(l) => l.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<FileSearch className="h-6 w-6" />}
                title="No audit entries recorded"
                description="Administrative actions will appear here automatically."
              />
            }
            columns={[
              {
                key: 'actor',
                header: 'Actor',
                render: (l) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{l.actorName}</div>
                    {l.actorRole && (
                      <div className="text-[11px] capitalize text-[#64748B] dark:text-slate-400">
                        {l.actorRole.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                render: (l) => (
                  <span className="font-mono-tabular font-semibold text-[#145CFF]">{l.action}</span>
                ),
              },
              {
                key: 'resource',
                header: 'Resource',
                render: (l) => <StatusBadge label={l.resourceType} tone="slate" />,
              },
              {
                key: 'summary',
                header: 'Summary',
                render: (l) => (
                  <span className="text-xs text-[#64748B] dark:text-slate-300">{l.summary}</span>
                ),
              },
              {
                key: 'timestamp',
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
      </PermissionGuard>
    </AdminLayout>
  );
}
