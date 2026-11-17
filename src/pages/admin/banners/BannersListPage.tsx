import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  Eye,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
} from '../../../components/admin/ui';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { DynamicBannerBuilder } from '../../../components/admin/banners/DynamicBannerBuilder';
import { DynamicBannerRenderer } from '../../../components/banners/DynamicBannerRenderer';
import {
  BANNER_PLACEMENT_OPTIONS,
  buildBackgroundLayerStyle,
  getWidthModeLabel,
  normalizeBannerFromApi,
  type BannerStatus,
} from '../../../lib/bannerBuilder';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { BannerRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function BannersListPage() {
  useSeoMeta({ title: 'Dynamic Banners | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRecord | null>(null);
  const [previewBanner, setPreviewBanner] = useState<BannerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (placementFilter) qs.set('placement', placementFilter);
      if (statusFilter) qs.set('status', statusFilter);
      if (sortBy) qs.set('sort', sortBy);
      const res = await apiRequest<{ ok: true; banners: BannerRecord[] }>(`/api/admin/banners?${qs.toString()}`);
      setBanners(res.banners || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load banners.');
    } finally {
      setLoading(false);
    }
  }, [search, placementFilter, statusFilter, sortBy]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const persistOrder = async (ordered: BannerRecord[]) => {
    const items = ordered.map((b, idx) => ({ id: b.id, displayOrder: idx + 1 }));
    setBanners(ordered.map((b, idx) => ({ ...b, displayOrder: idx + 1 })));
    try {
      await apiRequest('/api/admin/banners/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      });
      dispatch(showToast({ variant: 'success', message: 'Banner order saved.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Reorder failed.' }));
      loadBanners();
    }
  };

  const moveBanner = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= banners.length) return;
    const next = banners.slice();
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    persistOrder(next);
  };

  const handleDropRow = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = banners.findIndex((b) => b.id === draggedId);
    const toIdx = banners.findIndex((b) => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = banners.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDraggedId(null);
    persistOrder(next);
  };

  const handleToggleStatus = async (banner: BannerRecord) => {
    const currentStatus: BannerStatus =
      banner.status || (banner.isPublished ? 'published' : 'draft');
    const nextStatus: BannerStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await apiRequest(`/api/admin/banners/${banner.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id
            ? { ...b, status: nextStatus, isPublished: nextStatus === 'published' }
            : b,
        ),
      );
      dispatch(
        showToast({
          variant: 'success',
          message: `Banner marked as ${nextStatus}.`,
        }),
      );
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Status update failed.' }));
    }
  };

  const handleDuplicate = async (banner: BannerRecord) => {
    try {
      await apiRequest(`/api/admin/banners/${banner.id}/duplicate`, { method: 'POST' });
      dispatch(showToast({ variant: 'success', message: 'Banner duplicated as draft.' }));
      loadBanners();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Duplicate failed.' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/banners/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Banner deleted.' }));
      setDeleteTarget(null);
      loadBanners();
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
            title="Dynamic Banners"
            subtitle="Design multi-layered promotional banners with live preview, responsive widths, and storefront ordering."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Dynamic Banners' }]}
            actions={
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/homepage-layout"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] bg-white px-3.5 py-2 text-xs font-semibold text-[#0A1F44] hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Homepage Layout
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBanner(null);
                    setBuilderOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" /> Create Dynamic Banner
                </button>
              </div>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search banner name, title, eyebrow, subtitle..."
            filters={
              <div className="flex flex-wrap gap-2">
                <select
                  value={placementFilter}
                  onChange={(e) => setPlacementFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] bg-[#F4F7FF] px-3 text-xs font-medium"
                >
                  <option value="">All Placements</option>
                  {BANNER_PLACEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] bg-[#F4F7FF] px-3 text-xs font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] bg-[#F4F7FF] px-3 text-xs font-medium"
                >
                  <option value="order">Sort: Display Order</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="newest">Sort: Newest</option>
                </select>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadBanners} />}

          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-[#E4EAF5] bg-white" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <EmptyStateCard
              icon={<ImagePlus className="h-6 w-6" />}
              title="No dynamic banners found"
              description="Launch the Dynamic Banner Builder to create solid, gradient, or image-layered banners for any storefront slot."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setEditingBanner(null);
                    setBuilderOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Create Dynamic Banner
                </button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E4EAF5] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4EAF5] bg-[#F8FAFF] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 pl-4 pr-2 w-10">Order</th>
                      <th className="py-3 px-3">Banner &amp; Visual</th>
                      <th className="py-3 px-3">Placement</th>
                      <th className="py-3 px-3">Width</th>
                      <th className="py-3 px-3 text-center">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F9]">
                    {banners.map((raw, index) => {
                      const b = normalizeBannerFromApi(raw as unknown as Record<string, unknown>);
                      const bgStyle = buildBackgroundLayerStyle(b);
                      const isPublished = b.status === 'published' || (b.status === 'scheduled' && b.isPublished);

                      return (
                        <tr
                          key={b.id || index}
                          draggable
                          onDragStart={() => setDraggedId(b.id || null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => b.id && handleDropRow(b.id)}
                          className={`group transition-colors hover:bg-[#F8FAFF] ${
                            draggedId === b.id ? 'opacity-50 bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="py-3 pl-4 pr-2">
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-4 w-4 cursor-grab text-slate-400" />
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveBanner(index, -1)}
                                  aria-label="Move banner up"
                                  className="text-slate-400 hover:text-[#145CFF] disabled:opacity-25"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === banners.length - 1}
                                  onClick={() => moveBanner(index, 1)}
                                  aria-label="Move banner down"
                                  className="text-slate-400 hover:text-[#145CFF] disabled:opacity-25"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="font-mono-tabular text-xs font-bold text-[#0A1F44] ml-0.5">
                                {b.displayOrder}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div
                                style={bgStyle}
                                className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-[#DCE6F7] flex items-center justify-center"
                              >
                                {b.desktopImageUrl ? (
                                  <img
                                    src={b.desktopImageUrl}
                                    alt={b.title}
                                    className="h-full w-full object-cover opacity-85"
                                  />
                                ) : (
                                  <span
                                    className="px-1.5 text-[9px] font-bold truncate"
                                    style={{ color: b.typographySettings.titleColor }}
                                  >
                                    {b.title}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {b.eyebrow && (
                                    <span className="text-[10px] font-bold uppercase text-[#145CFF]">
                                      {b.eyebrow}
                                    </span>
                                  )}
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-slate-600">
                                    {b.backgroundType.replace('_', ' + ')}
                                  </span>
                                </div>
                                <div className="font-bold text-xs text-[#0A1F44] truncate max-w-[260px]">
                                  {b.name || b.title}
                                </div>
                                <div className="text-[11px] text-[#64748B] truncate max-w-[260px]">
                                  {b.title}
                                  {b.highlightedTitle ? ` ${b.highlightedTitle}` : ''} · {b.destinationUrl}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <StatusBadge label={b.placement.replace(/_/g, ' ')} tone="blue" />
                          </td>

                          <td className="py-3 px-3 text-xs font-semibold text-[#334155]">
                            {getWidthModeLabel(b.widthMode, b.customWidthPercent)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="font-mono-tabular text-xs font-semibold text-[#0A1F44]">
                              {b.priority}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(raw)}
                              title="Toggle Published / Draft"
                              className="inline-flex items-center gap-2"
                            >
                              <span
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  isPublished ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    isPublished ? 'translate-x-4.5' : 'translate-x-1'
                                  }`}
                                />
                              </span>
                              <StatusBadge
                                label={b.status}
                                tone={
                                  b.status === 'published'
                                    ? 'emerald'
                                    : b.status === 'scheduled'
                                      ? 'blue'
                                      : 'amber'
                                }
                              />
                            </button>
                          </td>

                          <td className="py-3 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewBanner(raw)}
                                title="Preview Banner"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] px-2 py-1.5 text-xs font-semibold text-[#334155] hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5 text-[#145CFF]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBanner(raw);
                                  setBuilderOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] px-2.5 py-1.5 text-xs font-semibold text-[#0A1F44] hover:bg-slate-50"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(raw)}
                                title="Duplicate Banner"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] px-2 py-1.5 text-xs font-semibold text-[#334155] hover:bg-slate-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(raw)}
                                aria-label={`Delete ${b.title}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create / Edit Dynamic Banner Builder Modal */}
          {builderOpen && (
            <DynamicBannerBuilder
              asModal
              initialBanner={editingBanner}
              bannerId={editingBanner?.id || null}
              onClose={() => {
                setBuilderOpen(false);
                setEditingBanner(null);
              }}
              onSaved={() => {
                setBuilderOpen(false);
                setEditingBanner(null);
                loadBanners();
              }}
            />
          )}

          {/* Standalone Quick Preview Modal */}
          {previewBanner && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs"
              onClick={() => setPreviewBanner(null)}
            >
              <div
                className="w-full max-w-5xl max-h-[92dvh] flex flex-col rounded-3xl bg-white p-4 sm:p-6 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-extrabold text-[#0A1F44] truncate">
                      {previewBanner.name || previewBanner.title}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Placement: {previewBanner.placement.replace(/_/g, ' ')} · Width:{' '}
                      {getWidthModeLabel(previewBanner.widthMode, previewBanner.customWidthPercent)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close quick preview"
                    onClick={() => setPreviewBanner(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E4EAF5] text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pt-4">
                  <div className="rounded-2xl bg-[#F4F7FF] p-4 sm:p-5">
                    <DynamicBannerRenderer banner={previewBanner} previewMode />
                  </div>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Dynamic Banner"
            message={`Delete banner "${deleteTarget?.name || deleteTarget?.title}" permanently?`}
            confirmLabel="Delete"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
