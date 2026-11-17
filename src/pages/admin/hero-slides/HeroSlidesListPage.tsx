import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Image, Plus, Trash2 } from 'lucide-react';
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
import type { HeroSlideRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function HeroSlidesListPage() {
  useSeoMeta({ title: 'Hero Slides | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [slides, setSlides] = useState<HeroSlideRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [placementFilter, setPlacementFilter] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlideRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (placementFilter) qs.set('placement', placementFilter);
      if (search.trim()) qs.set('q', search.trim());
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiRequest<{ ok: true; slides: HeroSlideRecord[] }>(`/api/admin/hero-slides?${qs.toString()}`);
      setSlides(res.slides || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load hero slides.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, placementFilter]);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/hero-slides/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Hero slide deleted.' }));
      setDeleteTarget(null);
      loadSlides();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Hero Slides"
            subtitle="Manage storefront homepage hero carousel slides, headlines, responsive images, and campaign schedules."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Hero Slides' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/cart-hero-slider"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  Cart Hero Slider →
                </Link>
                <Link
                  to="/admin/checkout-hero-slider"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  Checkout Hero Slider →
                </Link>
                <Link
                  to="/admin/wishlist-hero-slider"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  Wishlist Hero Slider →
                </Link>
                <Link
                  to="/admin/hero-slides/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
                >
                  <Plus className="h-4 w-4" /> Add Hero Slide
                </Link>
              </div>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by heading, badge, or subtitle..."
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={placementFilter}
                  onChange={(e) => setPlacementFilter(e.target.value)}
                  aria-label="Filter hero slides by placement"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs text-[#101B35] dark:text-slate-100"
                >
                  <option value="home">Homepage Carousel</option>
                  <option value="cart">Cart Hero Slider</option>
                  <option value="checkout">Checkout Hero Slider</option>
                  <option value="wishlist">Wishlist Hero Slider</option>
                  <option value="">All Placements</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter hero slides by status"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs text-[#101B35] dark:text-slate-100"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadSlides} />}

          <DataTable<HeroSlideRecord>
            rows={slides}
            rowKey={(s) => s.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Image className="h-6 w-6" />}
                title="No hero slides configured"
                description="Create your first storefront hero slide to highlight flagship launches and promotions."
                action={
                  <Link
                    to="/admin/hero-slides/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Hero Slide
                  </Link>
                }
              />
            }
            columns={[
              {
                key: 'slide',
                header: 'Slide Preview & Heading',
                render: (s) => (
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900">
                      <ResilientImage src={s.desktopImageUrl} alt={s.heading} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block rounded-md bg-[#EAF1FF] dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-[#145CFF]">
                        {s.badgeText}
                      </span>
                      <div className="mt-1 font-semibold text-[#101B35] dark:text-white truncate">
                        {s.heading} {s.headlineLine2 ? `— ${s.headlineLine2}` : ''}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-md">
                        {s.subtitle || 'No subtitle'}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'cta',
                header: 'CTA Link',
                render: (s) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-slate-200">{s.ctaText}</div>
                    <div className="font-mono-tabular text-[11px] text-[#64748B] dark:text-slate-400">{s.ctaUrl}</div>
                  </div>
                ),
              },
              {
                key: 'sortOrder',
                header: 'Order',
                align: 'center',
                render: (s) => <span className="font-mono-tabular font-semibold">{s.sortOrder}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (s) => (
                  <StatusBadge label={s.isActive ? 'Active' : 'Inactive'} tone={s.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (s) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/hero-slides/${s.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
            title="Delete Hero Slide"
            message={`Remove hero slide "${deleteTarget?.heading}"? It will no longer appear on the storefront homepage carousel.`}
            confirmLabel="Delete Slide"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
