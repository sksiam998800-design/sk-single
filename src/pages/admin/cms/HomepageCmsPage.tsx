import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function HomepageCmsPage() {
  useSeoMeta({ title: 'Homepage CMS | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLinkText, setAnnouncementLinkText] = useState('');
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');

  const [giftEnabled, setGiftEnabled] = useState(true);
  const [giftTitle, setGiftTitle] = useState('');
  const [giftSubtitle, setGiftSubtitle] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftCtaLabel, setGiftCtaLabel] = useState('Shop Picks');
  const [giftCtaUrl, setGiftCtaUrl] = useState('/shop');

  const [trustEnabled, setTrustEnabled] = useState(true);
  const [trustTitle, setTrustTitle] = useState('');
  const [trustSubtitle, setTrustSubtitle] = useState('');
  const [trustBulletsText, setTrustBulletsText] = useState('');

  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: true;
        config: {
          announcementBar?: { enabled?: boolean; text?: string; linkText?: string; linkUrl?: string };
          featureBanners?: {
            giftBanner?: { enabled?: boolean; title?: string; subtitle?: string; description?: string; ctaLabel?: string; ctaUrl?: string };
            trustBanner?: { enabled?: boolean; title?: string; subtitle?: string; bullets?: string[] };
          };
          enabledSections?: Record<string, boolean>;
        };
      }>('/api/admin/cms/homepage');
      const c = res.config || {};
      setAnnouncementEnabled(Boolean(c.announcementBar?.enabled ?? true));
      setAnnouncementText(c.announcementBar?.text || '');
      setAnnouncementLinkText(c.announcementBar?.linkText || '');
      setAnnouncementLinkUrl(c.announcementBar?.linkUrl || '');

      const g = c.featureBanners?.giftBanner;
      setGiftEnabled(Boolean(g?.enabled ?? true));
      setGiftTitle(g?.title || 'Thoughtful Tech Gifts');
      setGiftSubtitle(g?.subtitle || 'Curated under ৳5,000');
      setGiftDescription(g?.description || 'Ready-to-gift gadgets & accessories wrapped with NOVARA warranty.');
      setGiftCtaLabel(g?.ctaLabel || 'Explore Gifts');
      setGiftCtaUrl(g?.ctaUrl || '/shop');

      const t = c.featureBanners?.trustBanner;
      setTrustEnabled(Boolean(t?.enabled ?? true));
      setTrustTitle(t?.title || 'Why Shop With NOVARA');
      setTrustSubtitle(t?.subtitle || 'Authentic Warranty & Nationwide Delivery');
      setTrustBulletsText((t?.bullets || []).join('\n'));

      const loadedSections = c.enabledSections || {};
      setEnabledSections({
        ...loadedSections,
        testimonials: loadedSections.testimonials ?? loadedSections.reviews ?? true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load homepage CMS config.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/cms/homepage', {
        method: 'PUT',
        body: JSON.stringify({
          announcementBar: {
            enabled: announcementEnabled,
            text: announcementText,
            linkText: announcementLinkText.trim(),
            linkUrl: announcementLinkUrl.trim(),
          },
          featureBanners: {
            giftBanner: {
              enabled: giftEnabled,
              title: giftTitle,
              subtitle: giftSubtitle,
              description: giftDescription,
              ctaLabel: giftCtaLabel,
              ctaUrl: giftCtaUrl,
            },
            trustBanner: {
              enabled: trustEnabled,
              title: trustTitle,
              subtitle: trustSubtitle,
              bullets: trustBulletsText
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            },
          },
          enabledSections: {
            ...enabledSections,
            reviews: enabledSections.testimonials ?? enabledSections.reviews ?? true,
          },
        }),
      });
      dispatch(showToast({ variant: 'success', message: 'Homepage CMS settings published to storefront.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  const SECTION_KEYS: Array<{ key: string; label: string }> = [
    { key: 'hero', label: 'Hero Slider Banner' },
    { key: 'promoBento', label: 'Promo Bento Highlights' },
    { key: 'categories', label: 'Category Discovery Grid' },
    { key: 'flashSales', label: 'Flash Sales & Deals' },
    { key: 'featuredProducts', label: 'Featured Products Row' },
    { key: 'newArrivals', label: 'New Arrivals Row' },
    { key: 'bestSellers', label: 'Best Sellers Row' },
    { key: 'trendingProducts', label: 'Trending Products Row' },
    { key: 'featureBanners', label: 'Gift & Trust Feature Banners' },
    { key: 'premiumCollection', label: 'Premium Collection Shelf' },
    { key: 'testimonials', label: 'Verified Customer Testimonials' },
  ];

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[1100px] mx-auto">
          <AdminPageHeader
            title="Homepage CMS"
            subtitle="Configure announcement strip, storefront gift & trust banners, and homepage section visibility."
            breadcrumbs={[{ label: 'Content Management' }, { label: 'Homepage CMS' }]}
            actions={
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/hero-slides"
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3 py-2 text-xs font-semibold"
                >
                  Hero Slides
                </Link>
                <Link
                  to="/admin/cms/sections"
                  className="rounded-xl bg-[#EAF1FF] px-3 py-2 text-xs font-semibold text-[#145CFF]"
                >
                  Custom Sections →
                </Link>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Announcement Strip */}
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Top Announcement Bar</h2>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                    Enabled
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-semibold">Announcement Message</label>
                    <input
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Link Text</label>
                    <input
                      value={announcementLinkText}
                      onChange={(e) => setAnnouncementLinkText(e.target.value)}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Link URL</label>
                    <input
                      value={announcementLinkUrl}
                      onChange={(e) => setAnnouncementLinkUrl(e.target.value)}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section Visibility */}
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-[#145CFF]" /> Homepage Block Visibility
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {SECTION_KEYS.map((s) => (
                    <label
                      key={s.key}
                      className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3 text-xs font-semibold cursor-pointer"
                    >
                      <span>{s.label}</span>
                      <input
                        type="checkbox"
                        checked={enabledSections[s.key] ?? true}
                        onChange={(e) =>
                          setEnabledSections((prev) => ({ ...prev, [s.key]: e.target.checked }))
                        }
                        className="h-4 w-4 rounded text-[#145CFF]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Feature Banners */}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">Gift Curation Banner</h3>
                    <input
                      type="checkbox"
                      checked={giftEnabled}
                      onChange={(e) => setGiftEnabled(e.target.checked)}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </div>
                  <input
                    value={giftTitle}
                    onChange={(e) => setGiftTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                  <input
                    value={giftSubtitle}
                    onChange={(e) => setGiftSubtitle(e.target.value)}
                    placeholder="Subtitle"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                  <textarea
                    rows={2}
                    value={giftDescription}
                    onChange={(e) => setGiftDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2.5 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={giftCtaLabel}
                      onChange={(e) => setGiftCtaLabel(e.target.value)}
                      placeholder="CTA Label"
                      className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                    <input
                      value={giftCtaUrl}
                      onChange={(e) => setGiftCtaUrl(e.target.value)}
                      placeholder="CTA URL"
                      className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">Trust & Guarantee Banner</h3>
                    <input
                      type="checkbox"
                      checked={trustEnabled}
                      onChange={(e) => setTrustEnabled(e.target.checked)}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </div>
                  <input
                    value={trustTitle}
                    onChange={(e) => setTrustTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                  <input
                    value={trustSubtitle}
                    onChange={(e) => setTrustSubtitle(e.target.value)}
                    placeholder="Subtitle"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">Trust Bullet Points (one per line)</label>
                    <textarea
                      rows={4}
                      value={trustBulletsText}
                      onChange={(e) => setTrustBulletsText(e.target.value)}
                      className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Publishing...' : 'Publish Homepage CMS'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
