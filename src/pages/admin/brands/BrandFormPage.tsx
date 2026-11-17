import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { BrandItem, ProductItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useSeoMeta({ title: `${isEdit ? 'Edit' : 'Add'} Brand | NOVARA Admin`, noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [linkedProducts, setLinkedProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const [logoUrl, setLogoUrl] = useState('');
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setLogoUrl('');
      setCloudinaryPublicId('');
      setDescription('');
      setWebsiteUrl('');
      setSeoTitle('');
      setSeoDescription('');
      setIsActive(true);
      setLinkedProducts([]);
      return;
    }
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ ok: true; brand: BrandItem; products?: ProductItem[] }>(`/api/admin/brands/${id}`);
        if (cancelled) return;
        const b = res.brand;
        setName(b.name || '');
        setSlug(b.slug || '');
        setSlugManuallyEdited(true);
        setLogoUrl(b.logoUrl || '');
        setCloudinaryPublicId(b.cloudinaryPublicId || '');
        setDescription(b.description || '');
        setWebsiteUrl(b.websiteUrl || '');
        setSeoTitle(b.seoTitle || '');
        setSeoDescription(b.seoDescription || '');
        setIsActive(Boolean(b.isActive));
        setLinkedProducts(res.products || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load brand.');
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
        slug: (slug.trim() || slugify(name)).toLowerCase(),
        logoUrl: logoUrl.trim(),
        cloudinaryPublicId: logoUrl.trim() ? cloudinaryPublicId : '',
        description: description.trim(),
        websiteUrl: websiteUrl.trim(),
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        isActive,
      };
      if (isEdit && id) {
        await apiRequest(`/api/admin/brands/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Brand updated.' }));
      } else {
        await apiRequest('/api/admin/brands', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Brand created.' }));
      }
      navigate('/admin/brands');
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
            title={isEdit ? 'Edit Brand' : 'Add Brand'}
            subtitle="Configure official brand profile, Cloudinary logo, and SEO defaults."
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'Brands', to: '/admin/brands' },
              { label: isEdit ? 'Edit Brand' : 'Add Brand' },
            ]}
            actions={
              <Link
                to="/admin/brands"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
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
                    <label className="mb-1 block text-xs font-semibold">Brand Name *</label>
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
                    <label className="mb-1 block text-xs font-semibold">URL Slug *</label>
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
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Official Website URL</label>
                    <input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Brand Story / Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>

                <CloudinaryImageField
                  label="Brand Logo"
                  folder="novara/brands"
                  value={logoUrl}
                  onChange={(url, pubId) => {
                    setLogoUrl(url);
                    setCloudinaryPublicId(pubId || '');
                  }}
                />

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

                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  Active Brand
                </label>
              </div>

              {isEdit && linkedProducts.length > 0 && (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-2">
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                    Linked Products ({linkedProducts.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {linkedProducts.map((p) => (
                      <Link
                        key={p.id}
                        to={`/admin/products/${p.id}`}
                        className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold hover:text-[#145CFF]"
                      >
                        {p.name} ({p.sku})
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Link
                  to="/admin/brands"
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
                  {saving ? 'Saving...' : isEdit ? 'Update Brand' : 'Create Brand'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
