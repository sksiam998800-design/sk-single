import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Boxes, History, Sliders } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
} from '../../../components/admin/ui';
import { Modal } from '../../../components/ui/Modal';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { ProductItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface InventoryStockItem extends ProductItem {
  availableStock: number;
}

export function InventoryListPage() {
  useSeoMeta({ title: 'Inventory Overview | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [items, setItems] = useState<InventoryStockItem[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adjustTarget, setAdjustTarget] = useState<InventoryStockItem | null>(null);
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState('10');
  const [reason, setReason] = useState('Warehouse restock');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (stockFilter) qs.set('stockFilter', stockFilter);
      qs.set('page', String(page));
      qs.set('limit', '25');
      const res = await apiRequest<{
        ok: true;
        items: InventoryStockItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/admin/inventory/stock?${qs.toString()}`);
      setItems(res.items || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inventory stock.');
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdjust = (item: InventoryStockItem) => {
    setAdjustTarget(item);
    setVariantId(item.hasVariants && item.variants?.length ? item.variants[0]._id || '' : '');
    setDelta('10');
    setReason('Warehouse restock');
  };

  const handleAdjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const numDelta = Number(delta);
    if (!Number.isFinite(numDelta) || numDelta === 0) {
      dispatch(showToast({ variant: 'warning', message: 'Enter a non-zero quantity delta.' }));
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustTarget.id,
          variantId: variantId || null,
          delta: numDelta,
          reason: reason.trim(),
        }),
      });
      dispatch(showToast({ variant: 'success', message: `Stock adjusted for "${adjustTarget.name}".` }));
      setAdjustTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Stock adjustment failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="inventory.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Inventory Overview"
            subtitle="Monitor real-time stock on hand, reserved allocations, low-stock alerts, and quick warehouse adjustments."
            breadcrumbs={[{ label: 'Product Management' }, { label: 'Inventory' }]}
            actions={
              <>
                <Link
                  to="/admin/inventory/history"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
                >
                  <History className="h-3.5 w-3.5" /> Stock History
                </Link>
                <Link
                  to="/admin/inventory/adjustments"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                >
                  <Sliders className="h-3.5 w-3.5" /> Stock Adjustments
                </Link>
              </>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Search product SKU or title..."
            filters={
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: '', label: 'All Stock' },
                  { key: 'low', label: 'Low Stock' },
                  { key: 'out', label: 'Out of Stock' },
                ].map((opt) => (
                  <button
                    key={opt.key || 'all'}
                    type="button"
                    onClick={() => {
                      setStockFilter(opt.key);
                      setPage(1);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      stockFilter === opt.key
                        ? 'bg-[#145CFF] text-white'
                        : 'border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 text-[#64748B] dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<InventoryStockItem>
            rows={items}
            rowKey={(i) => i.id}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyState={
              <EmptyStateCard
                icon={<Boxes className="h-6 w-6" />}
                title="No matching inventory items"
                description="Products added to the catalog will automatically appear here for stock monitoring."
              />
            }
            columns={[
              {
                key: 'product',
                header: 'Product & SKU',
                render: (item) => (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF]">
                      <ResilientImage src={item.images?.[0]?.url} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <Link
                        to={`/admin/products/${item.id}`}
                        className="font-semibold text-[#101B35] dark:text-white hover:text-[#145CFF]"
                      >
                        {item.name}
                      </Link>
                      <div className="font-mono-tabular text-[11px] text-[#64748B]">{item.sku}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'onHand',
                header: 'On Hand',
                align: 'center',
                render: (item) => <span className="font-mono-tabular font-semibold">{item.stockOnHand}</span>,
              },
              {
                key: 'reserved',
                header: 'Reserved',
                align: 'center',
                render: (item) => <span className="font-mono-tabular text-amber-600">{item.reservedStock}</span>,
              },
              {
                key: 'available',
                header: 'Available',
                align: 'center',
                render: (item) => {
                  const threshold = item.lowStockThreshold ?? 5;
                  return (
                    <span
                      className={`font-mono-tabular font-bold ${
                        item.availableStock <= 0
                          ? 'text-rose-600'
                          : item.availableStock <= threshold
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {item.availableStock}
                    </span>
                  );
                },
              },
              {
                key: 'health',
                header: 'Stock Health',
                render: (item) => {
                  const threshold = item.lowStockThreshold ?? 5;
                  const status =
                    item.availableStock <= 0
                      ? 'Out of Stock'
                      : item.availableStock <= threshold
                        ? 'Low Stock'
                        : 'Healthy';
                  const tone = item.availableStock <= 0 ? 'rose' : item.availableStock <= threshold ? 'amber' : 'emerald';
                  return <StatusBadge label={status} tone={tone} />;
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (item) => (
                  <button
                    type="button"
                    onClick={() => openAdjust(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#EAF1FF] dark:bg-blue-950/60 px-2.5 py-1.5 text-xs font-semibold text-[#145CFF] hover:bg-blue-100"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Quick Adjust
                  </button>
                ),
              },
            ]}
          />

          <Modal
            open={Boolean(adjustTarget)}
            onClose={() => setAdjustTarget(null)}
            title={`Adjust Stock · ${adjustTarget?.name || ''}`}
            size="md"
          >
            {adjustTarget && (
              <form onSubmit={handleAdjust} className="space-y-4">
                {adjustTarget.hasVariants && adjustTarget.variants?.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Select Variant</label>
                    <select
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      {adjustTarget.variants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.title} ({v.sku}) — Current: {v.stockOnHand}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold">Quantity Delta (+ add, - deduct) *</label>
                  <input
                    type="number"
                    required
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Audit Reason *</label>
                  <input
                    required
                    minLength={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Supplier delivery, cycle count, damaged stock..."
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTarget(null)}
                    className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                  >
                    {saving ? 'Applying...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
