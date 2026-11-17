import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Edit3, Plus, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
} from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { BlogPostItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BlogManagementPage() {
  useSeoMeta({ title: 'Blog Management | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('NOVARA Editorial');
  const [category, setCategory] = useState('Buying Guides');
  const [tagsText, setTagsText] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; posts: BlogPostItem[] }>('/api/admin/cms/blogs');
      setPosts(res.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load blog posts.');
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
    setExcerpt('');
    setContent('');
    setCoverImageUrl('');
    setAuthorName('NOVARA Editorial');
    setCategory('Buying Guides');
    setTagsText('');
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEdit = (p: BlogPostItem) => {
    setEditingId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt || '');
    setContent(p.content || '');
    setCoverImageUrl(p.coverImageUrl || '');
    setAuthorName(p.authorName || 'NOVARA Editorial');
    setCategory(p.category || 'Buying Guides');
    setTagsText((p.tags || []).join(', '));
    setIsPublished(Boolean(p.isPublished));
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: (slug.trim() || slugify(title)).toLowerCase(),
        excerpt: excerpt.trim(),
        content,
        coverImageUrl: coverImageUrl.trim(),
        authorName: authorName.trim() || 'NOVARA Editorial',
        category: category.trim() || 'Buying Guides',
        tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
        isPublished,
      };
      if (editingId) {
        await apiRequest(`/api/admin/cms/blogs/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Blog article updated.' }));
      } else {
        await apiRequest('/api/admin/cms/blogs', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Blog article published.' }));
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
      await apiRequest(`/api/admin/cms/blogs/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Blog post deleted.' }));
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
            title="Blog Management"
            subtitle="Publish editorial buying guides, product comparisons, and store news for /blog."
            breadcrumbs={[{ label: 'Content Management' }, { label: 'Blog Management' }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Write Article
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<BlogPostItem>
            rows={posts}
            rowKey={(p) => p.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<BookOpen className="h-6 w-6" />}
                title="No blog articles yet"
                description="Write buying guides and SEO-friendly editorial posts to engage storefront visitors."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Write Article
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'article',
                header: 'Article',
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] bg-[#F4F7FF]">
                      <ResilientImage src={p.coverImageUrl} alt={p.title} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#101B35] dark:text-white">{p.title}</div>
                      <div className="text-[11px] text-[#64748B]">
                        /blog/{p.slug} · {p.authorName}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: (p) => <StatusBadge label={p.category} tone="blue" />,
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <StatusBadge label={p.isPublished ? 'Published' : 'Draft'} tone={p.isPublished ? 'emerald' : 'amber'} />
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
            title={editingId ? 'Edit Blog Article' : 'Write Blog Article'}
            size="lg"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Article Title *</label>
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
                <div>
                  <label className="mb-1 block text-xs font-semibold">Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Author Name</label>
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Excerpt Summary</label>
                <input
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <CloudinaryImageField
                label="Article Cover Image"
                folder="novara/blog"
                value={coverImageUrl}
                onChange={(url) => setCoverImageUrl(url)}
              />
              <div>
                <label className="mb-1 block text-xs font-semibold">Article Body *</label>
                <textarea
                  required
                  minLength={10}
                  rows={7}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Tags (comma separated)</label>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
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
                  {saving ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Blog Article"
            message={`Delete "${deleteTarget?.title}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
