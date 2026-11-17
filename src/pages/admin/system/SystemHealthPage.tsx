import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface SystemHealthPayload {
  ok: true;
  database: {
    readyState: number;
    status: string;
    name: string;
    host: string;
    latencyMs: number | null;
    collections: Record<string, number>;
  };
  server: {
    nodeVersion: string;
    environment: string;
    uptimeSeconds: number;
    memoryRssMb: number;
    heapUsedMb: number;
  };
  integrations: Record<string, boolean>;
}

export function SystemHealthPage() {
  useSeoMeta({ title: 'Database & System Health | NOVARA Admin', noIndex: true });

  const [health, setHealth] = useState<SystemHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<SystemHealthPayload>('/api/admin/system-health');
      setHealth(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch system health telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  return (
    <AdminLayout>
      <PermissionGuard permission="system.view">
        <div className="space-y-5 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="System Health & Database"
            subtitle="Live MongoDB Atlas connection telemetry, collection document counts, runtime memory, and third-party integration readiness."
            breadcrumbs={[{ label: 'Database & Health' }, { label: 'System Health' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/settings/security"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#145CFF]" /> Maintenance Controls
                </Link>
                <button
                  type="button"
                  onClick={loadHealth}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Ping
                </button>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadHealth} />}

          {loading && !health ? (
            <LoadingCards count={3} />
          ) : (
            health && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                        MongoDB Atlas Status
                      </span>
                      <Database className="h-4 w-4 text-[#145CFF]" />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {health.database.status === 'connected' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                      <span className="font-display text-xl font-bold capitalize text-[#101B35] dark:text-white">
                        {health.database.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                      DB: {health.database.name} · Ping:{' '}
                      <span className="font-mono-tabular font-semibold">
                        {health.database.latencyMs != null ? `${health.database.latencyMs}ms` : 'N/A'}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                        Node.js Runtime
                      </span>
                      <Server className="h-4 w-4 text-[#145CFF]" />
                    </div>
                    <p className="font-display mt-2 text-xl font-bold text-[#101B35] dark:text-white">
                      {health.server.nodeVersion}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400 capitalize">
                      Env: {health.server.environment} · Uptime: {Math.floor(health.server.uptimeSeconds / 60)}m
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                        Memory Footprint
                      </span>
                      <Activity className="h-4 w-4 text-[#145CFF]" />
                    </div>
                    <p className="font-display font-mono-tabular mt-2 text-xl font-bold text-[#101B35] dark:text-white">
                      {health.server.heapUsedMb} MB Heap
                    </p>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                      RSS Total: {health.server.memoryRssMb} MB
                    </p>
                  </div>
                </div>

                <section className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                  <h2 className="font-display mb-4 text-sm font-bold text-[#101B35] dark:text-white">
                    MongoDB Collection Document Counts
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(health.database.collections).map(([col, count]) => (
                      <div key={col} className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900 p-3.5">
                        <p className="text-[11px] capitalize text-[#64748B] dark:text-slate-400">
                          {col.replace(/([A-Z])/g, ' $1')}
                        </p>
                        <p className="font-mono-tabular mt-1 text-lg font-bold text-[#101B35] dark:text-white">
                          {count.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                  <h2 className="font-display mb-4 text-sm font-bold text-[#101B35] dark:text-white">
                    Service Integration Readiness
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(health.integrations).map(([key, ready]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-3.5 text-xs"
                      >
                        <span className="capitalize font-semibold text-[#101B35] dark:text-slate-200">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        {ready ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            <XCircle className="h-3.5 w-3.5" /> Not Set
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
