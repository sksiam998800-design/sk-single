import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { PromotionalAdData } from '../../../types/commerce';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function AdvertisementFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  useSeoMeta({ title: `${isEditing ? 'Edit' : 'New'} Advertisement | NOVARA Admin`, noIndex: true });

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    altText: '',
    imageUrl: '',
    mobileImageUrl: '',
    cloudinaryPublicId: '',
    destinationUrl: '/shop',
    placement: 'homepage_mid' as PromotionalAdData['placement'],
    priority: '0',
    isEnabled: true,
    isPublished: true,
    startsAt: '',
    endsAt: '',
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setForm({
        title: '',
        altText: '',
        imageUrl: '',
        mobileImageUrl: '',
        cloudinaryPublicId: '',
        destinationUrl: '/shop',
        placement: 'homepage_mid',
        priority: '0',
        isEnabled: true,
        isPublished: true,
        startsAt: '',
        endsAt: '',
      });
      return;
    }
    setLoading(true);
    apiRequest<{ ok: true; ad: PromotionalAdData }>(`/api/admin/ads/${id}`)
      .then((res) => {
        const a = res.ad;
        setForm({
          title: a.title || '',
          altText: a.altText || '',
          imageUrl: a.imageUrl || '',
          mobileImageUrl: a.mobileImageUrl || '',
          cloudinaryPublicId: a.cloudinaryPublicId || '',
          destinationUrl: a.destinationUrl || '/shop',
          placement: a.placement || 'homepage_mid',
          priority: String(a.priority ?? 0),
          isEnabled: a.isEnabled !== false,
          isPublished: a.isPublished === true,
          startsAt: toLocalDateTimeInputValue(a.startsAt),
          endsAt: toLocalDateTimeInputValue(a.endsAt),
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load advertisement.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.imageUrl.trim() || !form.altText.trim()) {
      setError('Title, alt text, and creative image are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        altText: form.altText.trim(),
        imageUrl: form.imageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl.trim(),
        cloudinaryPublicId: form.imageUrl.trim() ? form.cloudinaryPublicId : '',
        destinationUrl: form.destinationUrl.trim() || '/shop',
        placement: form.placement,
        priority: Number(form.priority || 0),
        isEnabled: form.isEnabled,
        isPublished: form.isPublished,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      if (isEditing && id) {
        await apiRequest(`/api/admin/ads/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Advertisement updated.' }));
      } else {
        await apiRequest('/api/admin/ads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Advertisement created.' }));
      }
      navigate('/admin/advertisements');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save advertisement.';
      setError(msg);
      dispatch(showToast({ variant: 'error', message: msg }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="ads.manage">
        <div className="space-y-5 max-w-4xl mx-auto">
          <AdminPageHeader
            title={isEditing ? 'Edit Advertisement' : 'Create Advertisement'}
            subtitle="Configure ad placement, creative uploads, priority, and active storefront schedule."
            breadcrumbs={[
              { label: 'Marketing' },
              { label: 'Advertisements', to: '/admin/advertisements' },
              { label: isEditing ? 'Edit' : 'Create' },
            ]}
            actions={
              <Link
                to="/admin/advertisements"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Ads
              </Link>
            }
          />

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl border border-[#E4EAF5] bg-white" />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 space-y-4 shadow-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Ad Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Accessibility Alt Text *</label>
                  <input
                    required
                    value={form.altText}
                    onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Placement</label>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as PromotionalAdData['placement'] }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="homepage_mid">Homepage Mid</option>
                    <option value="homepage_bottom">Homepage Bottom</option>
                    <option value="category_sidebar">Category Sidebar</option>
                    <option value="product_detail">Product Detail</option>
                    <option value="promo_section">Promo Section</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Destination URL *</label>
                  <input
                    required
                    value={form.destinationUrl}
                    onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CloudinaryImageField
                  label="Desktop Creative *"
                  folder="ads"
                  value={form.imageUrl}
                  onChange={(url, publicId) =>
                    setForm((f) => ({
                      ...f,
                      imageUrl: url,
                      cloudinaryPublicId: url ? (publicId ?? f.cloudinaryPublicId) : '',
                    }))
                  }
                />
                <CloudinaryImageField
                  label="Mobile Creative (Optional)"
                  folder="ads"
                  value={form.mobileImageUrl}
                  onChange={(url) => setForm((f) => ({ ...f, mobileImageUrl: url }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Starts At</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ends At</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))}
                  />
                  <span>Enabled</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                  />
                  <span>Publish Live to Storefront</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E4EAF5] dark:border-slate-800">
                <Link
                  to="/admin/advertisements"
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : isEditing ? 'Update Ad' : 'Save Ad'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
