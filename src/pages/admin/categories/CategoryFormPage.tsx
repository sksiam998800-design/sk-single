import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { CategoryItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useSeoMeta({ title: `${isEdit ? 'Edit' : 'Add'} Category | NOVARA Admin`, noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const [parentId, setParentId] = useState('');
  const [iconName, setIconName] = useState('Package');
  const [imageUrl, setImageUrl] = useState('');
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('');
  const [description, setDescription] = useState('');
  const [attributeSchemaType, setAttributeSchemaType] = useState<CategoryItem['attributeSchemaType']>('general');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [showInHeader, setShowInHeader] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const listRes = await apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories');
        if (cancelled) return;
        setAllCategories(listRes.categories || []);

        if (id) {
          const singleRes = await apiRequest<{ ok: true; category: CategoryItem }>(`/api/admin/categories/${id}`);
          if (cancelled) return;
          const c = singleRes.category;
          setName(c.name || '');
          setNameBn(c.nameBn || '');
          setSlug(c.slug || '');
          setSlugManuallyEdited(true);
          setParentId(c.parentId || '');
          setIconName(c.iconName || 'Package');
          setImageUrl(c.imageUrl || '');
          setCloudinaryPublicId(c.cloudinaryPublicId || '');
          setDescription(c.description || '');
          setAttributeSchemaType(c.attributeSchemaType || 'general');
          setSortOrder(String(c.sortOrder ?? 0));
          setIsActive(Boolean(c.isActive));
          setShowInHeader(Boolean(c.showInHeader));
          setSeoTitle(c.seoTitle || '');
          setSeoDescription(c.seoDescription || '');
        } else {
          setName('');
          setNameBn('');
          setSlug('');
          setSlugManuallyEdited(false);
          setParentId('');
          setIconName('Package');
          setImageUrl('');
          setCloudinaryPublicId('');
          setDescription('');
          setAttributeSchemaType('general');
          setSortOrder('0');
          setIsActive(true);
          setShowInHeader(true);
          setSeoTitle('');
          setSeoDescription('');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load category.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nameBn: nameBn.trim(),
        slug: (slug.trim() || slugify(name)).toLowerCase(),
        parentId: parentId || null,
        iconName: iconName.trim() || 'Package',
        imageUrl: imageUrl.trim(),
        cloudinaryPublicId: imageUrl.trim() ? cloudinaryPublicId : '',
        description: description.trim(),
        attributeSchemaType,
        sortOrder: Number(sortOrder || 0),
        isActive,
        showInHeader,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
      };
      if (isEdit && id) {
        await apiRequest(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Category updated.' }));
      } else {
        await apiRequest('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Category created.' }));
      }
      navigate('/admin/categories');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="catalog.manage">
        <div className="space-y-5 max-w-[960px] mx-auto">
          <AdminPageHeader
            title={isEdit ? 'Edit Category' : 'Add Category'}
            subtitle="Configure category hierarchy, visual thumbnail, header menu inclusion, and SEO settings."
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'Categories', to: '/admin/categories' },
              { label: isEdit ? 'Edit Category' : 'Add Category' },
            ]}
            actions={
              <Link
                to="/admin/categories"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
            }
          />

          {error && <ErrorBanner message={error} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Category Name *</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!isEdit && !slugManuallyEdited) setSlug(slugify(e.target.value));
                      }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Bangla Name (বাংলা)</label>
                    <input
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Slug *</label>
                    <input
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setSlug(slugify(e.target.value));
                      }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Parent Category</label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="">None (Top-Level Category)</option>
                      {allCategories
                        .filter((c) => !c.parentId && c.id !== id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Attribute Schema</label>
                    <select
                      value={attributeSchemaType}
                      onChange={(e) => setAttributeSchemaType(e.target.value as CategoryItem['attributeSchemaType'])}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="general">General</option>
                      <option value="electronics">Electronics</option>
                      <option value="beauty">Beauty</option>
                      <option value="books">Books</option>
                      <option value="home">Home</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Sort Order</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>

                <CloudinaryImageField
                  label="Category Thumbnail"
                  folder="novara/categories"
                  value={imageUrl}
                  onChange={(url, pubId) => {
                    setImageUrl(url);
                    setCloudinaryPublicId(pubId || '');
                  }}
                />

                <div className="flex flex-wrap gap-6 pt-2 border-t border-[#E4EAF5] dark:border-slate-800 text-xs font-semibold">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                    Active Category
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={showInHeader} onChange={(e) => setShowInHeader(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                    Show in Header Navigation
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#E4EAF5] dark:border-slate-800">
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
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  to="/admin/categories"
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-5 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
