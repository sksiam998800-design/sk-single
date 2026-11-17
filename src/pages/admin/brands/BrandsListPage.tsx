import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Edit3, Plus, Trash2 } from 'lucide-react';
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
import type { BrandItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function BrandsListPage() {
  useSeoMeta({ title: 'Brands | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; brands: BrandItem[] }>('/api/admin/brands');
      setBrands(res.brands || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load brands.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = brands.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/brands/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: `Brand "${deleteTarget.name}" deleted.` }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="catalog.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Brands"
            subtitle="Manage store brands, Cloudinary logos, website URLs, and product associations."
            breadcrumbs={[{ label: 'Product Management' }, { label: 'Brands' }]}
            actions={
              <Link
                to="/admin/brands/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Brand
              </Link>
            }
          />

          <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search brand name or slug..." />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<BrandItem>
            rows={filtered}
            rowKey={(b) => b.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Award className="h-6 w-6" />}
                title="No brands configured"
                description="Add product brands to showcase authentic manufacturers and enable brand filtering."
                action={
                  <Link
                    to="/admin/brands/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Brand
                  </Link>
                }
              />
            }
            columns={[
              {
                key: 'brand',
                header: 'Brand',
                render: (b) => (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900">
                      <ResilientImage src={b.logoUrl} alt={b.name} className="h-full w-full object-contain p-1" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#101B35] dark:text-white">{b.name}</div>
                      <div className="font-mono-tabular text-[11px] text-[#64748B]">/{b.slug}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'products',
                header: 'Linked Products',
                align: 'center',
                render: (b) => <span className="font-mono-tabular font-semibold">{b.productCount ?? 0}</span>,
              },
              {
                key: 'website',
                header: 'Website',
                render: (b) => <span className="text-xs text-[#64748B]">{b.websiteUrl || '—'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (b) => (
                  <StatusBadge label={b.isActive ? 'Active' : 'Inactive'} tone={b.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (b) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/brands/${b.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(b)}
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
            title="Delete Brand"
            message={`Delete "${deleteTarget?.name}"? Brands linked to active products cannot be deleted until unlinked.`}
            confirmLabel="Delete Brand"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
