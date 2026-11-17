import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Plus, Tag, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
} from '../../../components/admin/ui';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { CouponItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function CouponsListPage() {
  useSeoMeta({ title: 'Coupons | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiRequest<{ ok: true; coupons: CouponItem[] }>(`/api/admin/coupons?${qs.toString()}`);
      setCoupons(res.coupons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load coupons.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: `Coupon ${deleteTarget.code} deleted.` }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="marketing.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Coupons"
            subtitle="Create discount codes, configure minimum spend rules, redemption caps, and campaign schedules."
            breadcrumbs={[{ label: 'Coupons & Offers' }, { label: 'Coupons' }]}
            actions={
              <Link
                to="/admin/coupons/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Create Coupon
              </Link>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search coupon code or description..."
            filters={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter coupons by status"
                className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
              >
                <option value="">All Coupons</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<CouponItem>
            rows={coupons}
            rowKey={(c) => c.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Tag className="h-6 w-6" />}
                title="No coupon codes configured"
                description="Create percentage or fixed Taka voucher codes for storefront checkout."
                action={
                  <Link
                    to="/admin/coupons/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Coupon
                  </Link>
                }
              />
            }
            columns={[
              {
                key: 'code',
                header: 'Coupon Code',
                render: (c) => (
                  <div>
                    <span className="inline-block rounded-lg bg-[#EAF1FF] dark:bg-blue-950/60 px-2.5 py-1 font-mono-tabular text-xs font-bold text-[#145CFF]">
                      {c.code}
                    </span>
                    {c.description && <div className="mt-1 text-[11px] text-[#64748B]">{c.description}</div>}
                  </div>
                ),
              },
              {
                key: 'discount',
                header: 'Discount',
                render: (c) => (
                  <div>
                    <div className="font-mono-tabular font-bold text-[#101B35] dark:text-white">
                      {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `৳${c.discountValue.toLocaleString('en-IN')} OFF`}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Min order: ৳{c.minOrderAmount.toLocaleString('en-IN')}
                      {c.maxDiscountAmount ? ` · Cap: ৳${c.maxDiscountAmount.toLocaleString('en-IN')}` : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'usage',
                header: 'Usage',
                render: (c) => (
                  <span className="font-mono-tabular text-xs">
                    {c.usedCount} / {c.usageLimit ?? '∞'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (c) => (
                  <StatusBadge label={c.isActive ? 'Active' : 'Disabled'} tone={c.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (c) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/coupons/${c.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Coupon"
            message={`Delete coupon "${deleteTarget?.code}"? Customers will no longer be able to redeem it at checkout.`}
            confirmLabel="Delete Coupon"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
