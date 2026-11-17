import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Sliders } from 'lucide-react';
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
import type { InventoryMovementRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function InventoryHistoryPage() {
  useSeoMeta({ title: 'Stock History | NOVARA Admin', noIndex: true });

  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; movements: InventoryMovementRecord[] }>('/api/admin/inventory/movements?limit=150');
      setMovements(res.movements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inventory history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = movements.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.productName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      m.actorName.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <PermissionGuard permission="inventory.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Stock Movement History"
            subtitle="Immutable audit ledger of warehouse restocks, sales deductions, reservations, and returns."
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'Inventory', to: '/admin/inventory' },
              { label: 'Stock History' },
            ]}
            actions={
              <Link
                to="/admin/inventory/adjustments"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Sliders className="h-3.5 w-3.5" /> New Adjustment
              </Link>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter by SKU, product name, reason, or staff actor..."
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<InventoryMovementRecord>
            rows={filtered}
            rowKey={(m) => m.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<History className="h-6 w-6" />}
                title="No inventory movements recorded"
                description="Manual adjustments, fulfilled shipments, and customer returns will populate this ledger."
              />
            }
            columns={[
              {
                key: 'time',
                header: 'Timestamp',
                render: (m) => (
                  <span className="font-mono-tabular text-[11px] text-[#64748B]">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'product',
                header: 'Product & SKU',
                render: (m) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{m.productName}</div>
                    <div className="font-mono-tabular text-[11px] text-[#64748B]">{m.sku}</div>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Event',
                render: (m) => (
                  <StatusBadge
                    label={m.type}
                    tone={m.type === 'sale' ? 'blue' : m.type === 'return' ? 'indigo' : m.delta >= 0 ? 'emerald' : 'amber'}
                  />
                ),
              },
              {
                key: 'delta',
                header: 'Delta',
                align: 'center',
                render: (m) => (
                  <span className={`font-mono-tabular font-bold ${m.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                ),
              },
              {
                key: 'balance',
                header: 'Before → After',
                render: (m) => (
                  <span className="font-mono-tabular text-xs">
                    {m.previousStockOnHand} → <strong>{m.newStockOnHand}</strong>
                  </span>
                ),
              },
              {
                key: 'reason',
                header: 'Reason & Actor',
                render: (m) => (
                  <div>
                    <div className="text-xs text-[#101B35] dark:text-slate-200">{m.reason}</div>
                    <div className="text-[11px] text-[#64748B]">By {m.actorName}</div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
