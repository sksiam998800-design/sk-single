import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Megaphone, Plus, Trash2 } from 'lucide-react';
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
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { PromotionalAdData } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function AdvertisementsListPage() {
  useSeoMeta({ title: 'Advertisements | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [ads, setAds] = useState<PromotionalAdData[]>([]);
  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionalAdData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (placementFilter) qs.set('placement', placementFilter);
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiRequest<{ ok: true; ads: PromotionalAdData[] }>(`/api/admin/ads?${qs.toString()}`);
      setAds(res.ads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load advertisements.');
    } finally {
      setLoading(false);
    }
  }, [search, placementFilter, statusFilter]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/ads/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Advertisement deleted.' }));
      setDeleteTarget(null);
      loadAds();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="ads.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Advertisements"
            subtitle="Manage sponsored ad placements, storefront priority, and click/impression tracking."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Advertisements' }]}
            actions={
              <Link
                to="/admin/advertisements/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> New Ad Placement
              </Link>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search ad title or URL..."
            filters={
              <div className="flex flex-wrap gap-2">
                <select
                  value={placementFilter}
                  onChange={(e) => setPlacementFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="">All Placements</option>
                  <option value="homepage_mid">Homepage Mid</option>
                  <option value="homepage_bottom">Homepage Bottom</option>
                  <option value="category_sidebar">Category Sidebar</option>
                  <option value="product_detail">Product Detail</option>
                  <option value="promo_section">Promo Section</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="">All States</option>
                  <option value="live">Live Only</option>
                  <option value="draft">Draft / Disabled</option>
                </select>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadAds} />}

          <DataTable<PromotionalAdData>
            rows={ads}
            rowKey={(a) => a.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Megaphone className="h-6 w-6" />}
                title="No advertisements configured"
                description="Create a promotional ad slot to display targeted storefront creatives with CTR metrics."
                action={
                  <Link
                    to="/admin/advertisements/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Ad
                  </Link>
                }
              />
            }
            columns={[
              {
                key: 'ad',
                header: 'Advertisement',
                render: (a) => (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900">
                      <ResilientImage src={a.imageUrl} alt={a.altText} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#101B35] dark:text-white truncate">{a.title}</div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-xs">{a.destinationUrl}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'placement',
                header: 'Placement',
                render: (a) => <StatusBadge label={a.placement.replace(/_/g, ' ')} tone="indigo" />,
              },
              {
                key: 'metrics',
                header: 'Impressions / Clicks',
                render: (a) => (
                  <span className="font-mono-tabular text-xs font-semibold text-[#101B35] dark:text-slate-200">
                    {(a.impressions || 0).toLocaleString()} / {(a.clicks || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (a) => {
                  const isLive = a.isEnabled && a.isPublished;
                  return (
                    <StatusBadge
                      label={isLive ? 'Live' : a.isEnabled ? 'Draft' : 'Disabled'}
                      tone={isLive ? 'emerald' : 'amber'}
                    />
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (a) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/advertisements/${a.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(a)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
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
            title="Delete Advertisement"
            message={`Delete advertisement "${deleteTarget?.title}"?`}
            confirmLabel="Delete"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
