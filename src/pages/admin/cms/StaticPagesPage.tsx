import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, FileText, Plus, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
} from '../../../components/admin/ui';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { CmsStaticPageItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function StaticPagesPage() {
  useSeoMeta({ title: 'Static Pages | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [pages, setPages] = useState<CmsStaticPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CmsStaticPageItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; pages: CmsStaticPageItem[] }>('/api/admin/cms/pages');
      setPages(res.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load static pages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setContent('');
    setSeoTitle('');
    setSeoDescription('');
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEdit = (p: CmsStaticPageItem) => {
    setEditingId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setContent(p.content);
    setSeoTitle(p.seoTitle || '');
    setSeoDescription(p.seoDescription || '');
    setIsPublished(p.isPublished);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: (slug.trim() || slugify(title)).toLowerCase(),
        content,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        isPublished,
      };
      if (editingId) {
        await apiRequest(`/api/admin/cms/pages/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'CMS page updated.' }));
      } else {
        await apiRequest('/api/admin/cms/pages', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'CMS page created.' }));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/cms/pages/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'CMS page deleted.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Static Pages"
            subtitle="Manage About Us, Privacy Policy, Terms & Conditions, Warranty Policy, and custom storefront pages."
            breadcrumbs={[{ label: 'Content Management' }, { label: 'Static Pages' }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Create Page
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<CmsStaticPageItem>
            rows={pages}
            rowKey={(p) => p.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<FileText className="h-6 w-6" />}
                title="No static pages yet"
                description="Publish legal policies, shipping guides, and company About pages for /pages/:slug."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Create Page
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'title',
                header: 'Page Title & URL',
                render: (p) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{p.title}</div>
                    <div className="font-mono-tabular text-[11px] text-[#64748B]">/pages/{p.slug}</div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <StatusBadge label={p.isPublished ? 'Published' : 'Draft'} tone={p.isPublished ? 'emerald' : 'amber'} />
                ),
              },
              {
                key: 'updatedAt',
                header: 'Last Updated',
                render: (p) => (
                  <span className="text-xs text-[#64748B]">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (p) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingId ? 'Edit Static Page' : 'Create Static Page'}
            size="lg"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Page Title *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editingId) setSlug(slugify(e.target.value));
                    }}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Slug *</label>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Page Content *</label>
                <textarea
                  required
                  minLength={5}
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">SEO Title</label>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">SEO Description</label>
                  <input
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Published
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Page'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Static Page"
            message={`Delete page "/pages/${deleteTarget?.slug}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
