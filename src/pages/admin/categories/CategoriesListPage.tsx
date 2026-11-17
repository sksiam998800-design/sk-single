import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, FolderTree, Plus, Trash2 } from 'lucide-react';
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
import type { CategoryItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function CategoriesListPage() {
  useSeoMeta({ title: 'Categories | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories');
      setCategories(res.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const filtered = categories.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.nameBn || '').toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: `Category "${deleteTarget.name}" deleted.` }));
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
            title="Categories"
            subtitle="Organize catalog taxonomy, parent-child category tree, header visibility, and attribute schemas."
            breadcrumbs={[{ label: 'Product Management' }, { label: 'Categories' }]}
            actions={
              <Link
                to="/admin/categories/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Category
              </Link>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search category name, Bangla title, or slug..."
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<CategoryItem>
            rows={filtered}
            rowKey={(c) => c.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<FolderTree className="h-6 w-6" />}
                title="No categories found"
                description="Create product categories to structure your storefront navigation and filters."
                action={
                  <Link
                    to="/admin/categories/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Category
                  </Link>
                }
              />
            }
            columns={[
              {
                key: 'category',
                header: 'Category',
                render: (c) => (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900">
                      <ResilientImage src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#101B35] dark:text-white">
                        {c.parentId ? '↳ ' : ''}
                        {c.name}
                        {c.nameBn ? <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">({c.nameBn})</span> : null}
                      </div>
                      <div className="font-mono-tabular text-[11px] text-[#64748B]">/{c.slug}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'parent',
                header: 'Parent',
                render: (c) => (
                  <span className="text-xs text-[#64748B]">{c.parentId ? catMap.get(c.parentId) || 'Parent' : 'Top Level'}</span>
                ),
              },
              {
                key: 'schema',
                header: 'Schema',
                render: (c) => <StatusBadge label={c.attributeSchemaType} tone="blue" />,
              },
              {
                key: 'header',
                header: 'Header Menu',
                render: (c) => (
                  <StatusBadge label={c.showInHeader ? 'Shown' : 'Hidden'} tone={c.showInHeader ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (c) => (
                  <StatusBadge label={c.isActive ? 'Active' : 'Inactive'} tone={c.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (c) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/categories/${c.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
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
            title="Delete Category"
            message={`Delete "${deleteTarget?.name}"? Categories with active products cannot be removed.`}
            confirmLabel="Delete Category"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
