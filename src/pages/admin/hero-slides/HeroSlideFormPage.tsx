import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { HeroSlideAlignment, HeroSlidePlacement, HeroSlideRecord } from '../../../types/commerce';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function HeroSlideFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  useSeoMeta({ title: `${isEditing ? 'Edit' : 'New'} Hero Slide | NOVARA Admin`, noIndex: true });

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    placement: 'home' as HeroSlidePlacement,
    badgeText: 'Up to 50% OFF',
    heading: '',
    headlineLine2: '',
    subtitle: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    cloudinaryPublicId: '',
    ctaText: 'Shop Now',
    ctaUrl: '/shop',
    textAlignment: 'left' as HeroSlideAlignment,
    overlayOpacity: '0',
    sortOrder: '0',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setForm({
        placement: 'home',
        badgeText: 'Up to 50% OFF',
        heading: '',
        headlineLine2: '',
        subtitle: '',
        desktopImageUrl: '',
        mobileImageUrl: '',
        cloudinaryPublicId: '',
        ctaText: 'Shop Now',
        ctaUrl: '/shop',
        textAlignment: 'left',
        overlayOpacity: '0',
        sortOrder: '0',
        startsAt: '',
        endsAt: '',
        isActive: true,
      });
      return;
    }
    setLoading(true);
    apiRequest<{ ok: true; slide: HeroSlideRecord }>(`/api/admin/hero-slides/${id}`)
      .then((res) => {
        const s = res.slide;
        setForm({
          placement: s.placement || 'home',
          badgeText: s.badgeText || 'Featured',
          heading: s.heading || '',
          headlineLine2: s.headlineLine2 || '',
          subtitle: s.subtitle || '',
          desktopImageUrl: s.desktopImageUrl || '',
          mobileImageUrl: s.mobileImageUrl || '',
          cloudinaryPublicId: s.cloudinaryPublicId || '',
          ctaText: s.ctaText || 'Shop Now',
          ctaUrl: s.ctaUrl || '/shop',
          textAlignment: s.textAlignment || 'left',
          overlayOpacity: String(s.overlayOpacity ?? 0),
          sortOrder: String(s.sortOrder ?? 0),
          startsAt: toLocalDateTimeInputValue(s.startsAt),
          endsAt: toLocalDateTimeInputValue(s.endsAt),
          isActive: s.isActive !== false,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load hero slide.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.heading.trim() || !form.desktopImageUrl.trim()) {
      setError('Heading and desktop hero image are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        placement: form.placement,
        badgeText: form.badgeText.trim() || 'Featured',
        heading: form.heading.trim(),
        headlineLine2: form.headlineLine2.trim(),
        subtitle: form.subtitle.trim(),
        desktopImageUrl: form.desktopImageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl.trim(),
        cloudinaryPublicId: form.desktopImageUrl.trim() ? form.cloudinaryPublicId : '',
        ctaText: form.placement === 'checkout' ? form.ctaText.trim() : form.ctaText.trim() || 'Shop Now',
        ctaUrl: form.ctaUrl.trim() || '/shop',
        textAlignment: form.textAlignment,
        overlayOpacity: Math.min(85, Math.max(0, Number(form.overlayOpacity || 0))),
        sortOrder: Number(form.sortOrder || 0),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isActive: form.isActive,
      };

      if (isEditing && id) {
        await apiRequest(`/api/admin/hero-slides/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Hero slide updated.' }));
      } else {
        await apiRequest('/api/admin/hero-slides', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Hero slide created.' }));
      }
      navigate(
        form.placement === 'cart'
          ? '/admin/cart-hero-slider'
          : form.placement === 'checkout'
            ? '/admin/checkout-hero-slider'
            : form.placement === 'wishlist'
              ? '/admin/wishlist-hero-slider'
              : '/admin/hero-slides',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save hero slide.';
      setError(msg);
      dispatch(showToast({ variant: 'error', message: msg }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-5xl mx-auto">
          <AdminPageHeader
            title={isEditing ? 'Edit Hero Slide' : 'Create Hero Slide'}
            subtitle="Configure responsive desktop/mobile imagery, promotional copy, and live storefront scheduling."
            breadcrumbs={[
              { label: 'Marketing' },
              { label: 'Hero Slides', to: '/admin/hero-slides' },
              { label: isEditing ? 'Edit' : 'Create' },
            ]}
            actions={
              <Link
                to="/admin/hero-slides"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Slides
              </Link>
            }
          />

          {error && <ErrorBanner message={error} />}

          {/* Live Preview */}
          <div className="rounded-2xl border border-[#D3E0FA] bg-gradient-to-r from-[#E4EEFD] via-[#EEF4FD] to-[#D7E4F8] p-5 sm:p-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#145CFF] mb-3">
              Storefront Live Preview
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-5">
              <div className="md:col-span-5 space-y-2">
                <span className="inline-block rounded-full bg-[#145CFF] px-3 py-0.5 text-[11px] font-bold text-white">
                  {form.badgeText || 'Badge'}
                </span>
                <div className="font-display text-2xl font-extrabold text-[#0B1730] leading-tight">
                  {form.heading || 'Primary Hero Heading'}
                  <span className="block text-[#145CFF]">{form.headlineLine2 || 'Accent Second Line'}</span>
                </div>
                <p className="text-xs text-slate-600">{form.subtitle || 'Supporting tagline appears here.'}</p>
                <span className="inline-block rounded-full bg-[#145CFF] px-4 py-1.5 text-xs font-semibold text-white">
                  {form.ctaText || 'Shop Now'} →
                </span>
              </div>
              <div className="md:col-span-7 aspect-[16/9] max-h-52 w-full overflow-hidden rounded-xl bg-white/80 border border-white">
                {form.desktopImageUrl ? (
                  <ResilientImage src={form.desktopImageUrl} alt={form.heading} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Upload desktop hero banner image below
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl border border-[#E4EAF5] bg-white" />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 space-y-5 shadow-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Slide Placement
                  </label>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as HeroSlidePlacement }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="home">Homepage Hero Carousel</option>
                    <option value="cart">Cart Page Hero Slider</option>
                    <option value="checkout">Checkout Page Hero Slider</option>
                    <option value="wishlist">Wishlist Page Hero Slider</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Badge Text *
                  </label>
                  <input
                    required
                    value={form.badgeText}
                    onChange={(e) => setForm((f) => ({ ...f, badgeText: e.target.value }))}
                    placeholder="Up to 50% OFF"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Headline Line 1 *
                  </label>
                  <input
                    required
                    value={form.heading}
                    onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
                    placeholder="Smart Technology"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Headline Line 2 (Accent Blue)
                  </label>
                  <input
                    value={form.headlineLine2}
                    onChange={(e) => setForm((f) => ({ ...f, headlineLine2: e.target.value }))}
                    placeholder="Better Life"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                  Subtitle
                </label>
                <textarea
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Discover the latest gadgets and upgrade your lifestyle with NOVARA."
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Button CTA Label {form.placement === 'checkout' ? '(Optional)' : '*'}
                  </label>
                  <input
                    required={form.placement !== 'checkout'}
                    value={form.ctaText}
                    onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Destination URL *
                  </label>
                  <input
                    required
                    value={form.ctaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="/shop"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CloudinaryImageField
                  label="Desktop Hero Banner Image *"
                  folder="hero-slides"
                  value={form.desktopImageUrl}
                  onChange={(url, publicId) =>
                    setForm((f) => ({
                      ...f,
                      desktopImageUrl: url,
                      cloudinaryPublicId: url ? (publicId ?? f.cloudinaryPublicId) : '',
                    }))
                  }
                />
                <CloudinaryImageField
                  label="Mobile Image URL (Optional)"
                  folder="hero-slides"
                  value={form.mobileImageUrl}
                  onChange={(url) => setForm((f) => ({ ...f, mobileImageUrl: url }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Schedule Start (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200 mb-1">
                    Schedule End (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <label className="flex h-10 items-center gap-2.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>Slide Active on Homepage</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E4EAF5] dark:border-slate-800">
                <Link
                  to="/admin/hero-slides"
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : isEditing ? 'Update Slide' : 'Publish Slide'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
