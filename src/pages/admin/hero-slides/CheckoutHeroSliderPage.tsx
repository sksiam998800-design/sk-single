import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  ExternalLink,
  Image,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  EmptyStateCard,
  ErrorBanner,
  LoadingCards,
  StatusBadge,
} from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { CartHeroSlider } from '../../../components/cart/CartHeroSlider';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import {
  DEFAULT_CHECKOUT_HERO_SETTINGS,
  filterAndSortHeroSlides,
  normalizeCheckoutHeroSettings,
} from '../../../lib/cartHero';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';
import type {
  CartHeroSliderSettings,
  HeroSlideAlignment,
  HeroSlideRecord,
} from '../../../types/commerce';

const DEFAULT_CHECKOUT_SHOWCASE_IMAGE = '/src/assets/images/checkout_hero_showcase_1794905450149.jpg';

interface SlideFormState {
  badgeText: string;
  heading: string;
  headlineLine2: string;
  subtitle: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  cloudinaryPublicId: string;
  ctaText: string;
  ctaUrl: string;
  textAlignment: HeroSlideAlignment;
  overlayOpacity: number;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_SLIDE_FORM: SlideFormState = {
  badgeText: 'Secure & Easy Checkout',
  heading: 'Complete Your Order',
  headlineLine2: 'Quickly & Securely!',
  subtitle: 'Shop with Confidence – Your Satisfaction is Our Priority.',
  desktopImageUrl: DEFAULT_CHECKOUT_SHOWCASE_IMAGE,
  mobileImageUrl: '',
  cloudinaryPublicId: '',
  ctaText: '',
  ctaUrl: '/shop',
  textAlignment: 'left',
  overlayOpacity: 0,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export function CheckoutHeroSliderPage() {
  useSeoMeta({ title: 'Checkout Hero Slider | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [slides, setSlides] = useState<HeroSlideRecord[]>([]);
  const [sliderSettings, setSliderSettings] = useState<CartHeroSliderSettings>(DEFAULT_CHECKOUT_HERO_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlideRecord | null>(null);
  const [slideForm, setSlideForm] = useState<SlideFormState>(EMPTY_SLIDE_FORM);
  const [savingSlide, setSavingSlide] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HeroSlideRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slidesRes, cmsRes] = await Promise.all([
        apiRequest<{ ok: true; slides: HeroSlideRecord[] }>('/api/admin/hero-slides?placement=checkout'),
        apiRequest<{ ok: true; config?: { checkoutHeroSettings?: Partial<CartHeroSliderSettings> } }>(
          '/api/admin/cms/homepage',
        ),
      ]);
      const sorted = (slidesRes.slides || [])
        .slice()
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
      setSlides(sorted);
      setSliderSettings(normalizeCheckoutHeroSettings(cmsRes.config?.checkoutHeroSettings));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Checkout Hero Slider configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const previewSlides = useMemo(
    () => filterAndSortHeroSlides(slides, { placement: 'checkout', activeOnly: true }),
    [slides],
  );

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = normalizeCheckoutHeroSettings(sliderSettings);
      await apiRequest('/api/admin/cms/homepage', {
        method: 'PUT',
        body: JSON.stringify({ checkoutHeroSettings: payload }),
      });
      setSliderSettings(payload);
      dispatch(showToast({ variant: 'success', message: 'Checkout Hero Slider settings published.' }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to save Checkout Hero Slider settings.',
        }),
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreateModal = () => {
    setEditingSlide(null);
    setSlideForm({
      ...EMPTY_SLIDE_FORM,
      sortOrder: slides.length,
    });
    setModalOpen(true);
  };

  const openEditModal = (slide: HeroSlideRecord) => {
    setEditingSlide(slide);
    setSlideForm({
      badgeText: slide.badgeText || 'Secure & Easy Checkout',
      heading: slide.heading || '',
      headlineLine2: slide.headlineLine2 || '',
      subtitle: slide.subtitle || '',
      desktopImageUrl: slide.desktopImageUrl || DEFAULT_CHECKOUT_SHOWCASE_IMAGE,
      mobileImageUrl: slide.mobileImageUrl || '',
      cloudinaryPublicId: slide.cloudinaryPublicId || '',
      ctaText: slide.ctaText || '',
      ctaUrl: slide.ctaUrl || '/shop',
      textAlignment: slide.textAlignment || 'left',
      overlayOpacity: Number(slide.overlayOpacity ?? 0),
      sortOrder: Number(slide.sortOrder ?? 0),
      startsAt: toLocalDateTimeInputValue(slide.startsAt),
      endsAt: toLocalDateTimeInputValue(slide.endsAt),
      isActive: slide.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSaveSlide = async (e: FormEvent) => {
    e.preventDefault();
    if (!slideForm.heading.trim() || !slideForm.desktopImageUrl.trim()) {
      dispatch(showToast({ variant: 'error', message: 'Heading and desktop image are required.' }));
      return;
    }

    setSavingSlide(true);
    try {
      const payload = {
        placement: 'checkout' as const,
        badgeText: slideForm.badgeText.trim() || 'Secure & Easy Checkout',
        heading: slideForm.heading.trim(),
        headlineLine2: slideForm.headlineLine2.trim(),
        subtitle: slideForm.subtitle.trim(),
        desktopImageUrl: slideForm.desktopImageUrl.trim(),
        mobileImageUrl: slideForm.mobileImageUrl.trim(),
        cloudinaryPublicId: slideForm.desktopImageUrl.trim() ? slideForm.cloudinaryPublicId : '',
        ctaText: slideForm.ctaText.trim(),
        ctaUrl: slideForm.ctaUrl.trim() || '/shop',
        textAlignment: slideForm.textAlignment,
        overlayOpacity: Math.min(85, Math.max(0, Number(slideForm.overlayOpacity || 0))),
        sortOrder: Number(slideForm.sortOrder || 0),
        startsAt: slideForm.startsAt ? new Date(slideForm.startsAt).toISOString() : null,
        endsAt: slideForm.endsAt ? new Date(slideForm.endsAt).toISOString() : null,
        isActive: slideForm.isActive,
      };

      if (editingSlide) {
        await apiRequest(`/api/admin/hero-slides/${editingSlide.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Checkout hero slide updated.' }));
      } else {
        await apiRequest('/api/admin/hero-slides', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Checkout hero slide created.' }));
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to save checkout hero slide.',
        }),
      );
    } finally {
      setSavingSlide(false);
    }
  };

  const handleToggleStatus = async (slide: HeroSlideRecord) => {
    setTogglingId(slide.id);
    try {
      await apiRequest(`/api/admin/hero-slides/${slide.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !slide.isActive }),
      });
      setSlides((prev) =>
        prev.map((item) => (item.id === slide.id ? { ...item, isActive: !slide.isActive } : item)),
      );
      dispatch(
        showToast({
          variant: 'success',
          message: `Slide "${slide.heading}" ${slide.isActive ? 'disabled' : 'enabled'}.`,
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to toggle slide status.',
        }),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleMoveSlide = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const reordered = slides.slice();
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((s) => s.id);
    const optimistic = reordered.map((s, idx) => ({ ...s, sortOrder: idx }));
    setSlides(optimistic);
    setReordering(true);

    try {
      await apiRequest('/api/admin/hero-slides/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      });
      dispatch(showToast({ variant: 'success', message: 'Checkout slide order updated.' }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to reorder slides.',
        }),
      );
      loadData();
    } finally {
      setReordering(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/hero-slides/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Checkout hero slide deleted.' }));
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to delete slide.',
        }),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="mx-auto max-w-[1440px] space-y-5">
          <AdminPageHeader
            title="Checkout Hero Slider"
            subtitle="Manage the secure checkout hero banner slider, autoplay controls, schedules, and confidence banner shown on /checkout."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Checkout Hero Slider' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/checkout"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#145CFF]" />
                  <span>View Storefront Checkout</span>
                </Link>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Checkout Slide</span>
                </button>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadData} />}

          {loading ? (
            <LoadingCards count={3} />
          ) : (
            <>
              {/* Live Storefront Preview */}
              <div className="overflow-hidden rounded-2xl border border-[#D4E2FA] bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 bg-[#F8FAFF] px-5 py-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#145CFF]">
                    Live Checkout Hero Preview ({previewSlides.length} active slide{previewSlides.length === 1 ? '' : 's'})
                  </div>
                  <StatusBadge
                    label={sliderSettings.enabled ? 'Slider Enabled' : 'Slider Disabled'}
                    tone={sliderSettings.enabled ? 'emerald' : 'slate'}
                  />
                </div>
                {sliderSettings.enabled && previewSlides.length > 0 ? (
                  <CartHeroSlider variant="checkout" slides={previewSlides} settings={sliderSettings} />
                ) : (
                  <div className="px-6 py-10 text-center text-xs text-slate-500">
                    {!sliderSettings.enabled
                      ? 'Checkout Hero Slider is currently disabled in global settings.'
                      : 'No active scheduled checkout slides right now. Add or activate a slide below.'}
                  </div>
                )}
              </div>

              {/* Global Slider Controls & Confidence Banner Settings */}
              <form
                onSubmit={handleSaveSettings}
                className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 sm:p-6 shadow-xs space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#145CFF]" />
                    <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                      Checkout Slider Behavior &amp; Confidence Card
                    </h2>
                  </div>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingSettings ? 'Saving...' : 'Save Slider Settings'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold cursor-pointer">
                    <span>Enable Checkout Hero Slider</span>
                    <input
                      type="checkbox"
                      checked={sliderSettings.enabled}
                      onChange={(e) => setSliderSettings((s) => ({ ...s, enabled: e.target.checked }))}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold cursor-pointer">
                    <span>Autoplay Slides</span>
                    <input
                      type="checkbox"
                      checked={sliderSettings.autoplay}
                      onChange={(e) => setSliderSettings((s) => ({ ...s, autoplay: e.target.checked }))}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold cursor-pointer">
                    <span>Show Pagination Dots</span>
                    <input
                      type="checkbox"
                      checked={sliderSettings.showDots}
                      onChange={(e) => setSliderSettings((s) => ({ ...s, showDots: e.target.checked }))}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold cursor-pointer">
                    <span>Show Prev / Next Arrows</span>
                    <input
                      type="checkbox"
                      checked={sliderSettings.showArrows}
                      onChange={(e) => setSliderSettings((s) => ({ ...s, showArrows: e.target.checked }))}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </label>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101B35] dark:text-slate-200">
                      Autoplay Interval (ms)
                    </label>
                    <input
                      type="number"
                      min={1500}
                      max={30000}
                      step={500}
                      value={sliderSettings.autoplayIntervalMs}
                      onChange={(e) =>
                        setSliderSettings((s) => ({
                          ...s,
                          autoplayIntervalMs: Number(e.target.value || 5500),
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101B35] dark:text-slate-200">
                      Transition Animation
                    </label>
                    <select
                      value={sliderSettings.transitionEffect}
                      onChange={(e) =>
                        setSliderSettings((s) => ({
                          ...s,
                          transitionEffect: e.target.value === 'slide' ? 'slide' : 'fade',
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="fade">Smooth Fade</option>
                      <option value="slide">Horizontal Slide</option>
                    </select>
                  </div>
                </div>

                {/* Confidence Card Settings */}
                <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF]/70 dark:bg-slate-900/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0F1D3A] dark:text-white">
                      <ShieldCheck className="h-4 w-4 text-[#145CFF]" />
                      <span>Shop with Confidence Card (Checkout Sidebar)</span>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sliderSettings.confidenceBanner?.enabled !== false}
                        onChange={(e) =>
                          setSliderSettings((s) => ({
                            ...s,
                            confidenceBanner: {
                              enabled: e.target.checked,
                              title: s.confidenceBanner?.title || 'Shop with Confidence',
                              subtitle:
                                s.confidenceBanner?.subtitle ||
                                '7-Day Return Policy • Secure Payment • 100% Genuine Products',
                            },
                          }))
                        }
                        className="h-4 w-4 rounded text-[#145CFF]"
                      />
                      <span>Enabled</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Card Title</label>
                      <input
                        value={sliderSettings.confidenceBanner?.title || ''}
                        onChange={(e) =>
                          setSliderSettings((s) => ({
                            ...s,
                            confidenceBanner: {
                              enabled: s.confidenceBanner?.enabled !== false,
                              title: e.target.value,
                              subtitle: s.confidenceBanner?.subtitle || '',
                            },
                          }))
                        }
                        placeholder="Shop with Confidence"
                        className="h-9 w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Card Subtitle</label>
                      <input
                        value={sliderSettings.confidenceBanner?.subtitle || ''}
                        onChange={(e) =>
                          setSliderSettings((s) => ({
                            ...s,
                            confidenceBanner: {
                              enabled: s.confidenceBanner?.enabled !== false,
                              title: s.confidenceBanner?.title || 'Shop with Confidence',
                              subtitle: e.target.value,
                            },
                          }))
                        }
                        placeholder="7-Day Return Policy • Secure Payment • 100% Genuine Products"
                        className="h-9 w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Slides List */}
              <div className="overflow-hidden rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                  <div>
                    <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                      Checkout Hero Slides ({slides.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Slides ordered ascending by Sort Order. Reorder, schedule, toggle, or edit anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#EAF1FF] px-3.5 py-2 text-xs font-semibold text-[#145CFF] hover:bg-[#DCE8FF]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Slide</span>
                  </button>
                </div>

                {slides.length === 0 ? (
                  <div className="p-6">
                    <EmptyStateCard
                      icon={<Image className="h-6 w-6" />}
                      title="No Checkout Hero Slides yet"
                      description="Add slides highlighting secure SSL checkout, nationwide express delivery, and authentic warranty coverage."
                      action={
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                        >
                          <Plus className="h-4 w-4" /> Create First Checkout Slide
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {slides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={reordering || index === 0}
                              onClick={() => handleMoveSlide(index, -1)}
                              aria-label={`Move ${slide.heading} up`}
                              className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono-tabular text-[11px] font-bold text-slate-500">
                              #{index + 1}
                            </span>
                            <button
                              type="button"
                              disabled={reordering || index === slides.length - 1}
                              onClick={() => handleMoveSlide(index, 1)}
                              aria-label={`Move ${slide.heading} down`}
                              className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] bg-[#F4F7FF]">
                            <ResilientImage
                              src={slide.desktopImageUrl}
                              alt={slide.heading}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-[#EAF1FF] px-2 py-0.5 text-[10px] font-bold text-[#145CFF]">
                                {slide.badgeText || 'Secure & Easy Checkout'}
                              </span>
                              <StatusBadge
                                label={slide.isActive ? 'Active' : 'Disabled'}
                                tone={slide.isActive ? 'emerald' : 'slate'}
                              />
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                                Align: {slide.textAlignment || 'left'}
                              </span>
                            </div>

                            <div className="font-display text-sm font-bold text-[#101B35] dark:text-white truncate">
                              {slide.heading}
                              {slide.headlineLine2 ? ` — ${slide.headlineLine2}` : ''}
                            </div>

                            <p className="text-xs text-slate-500 truncate max-w-xl">
                              {slide.subtitle || 'No subtitle'}
                              {slide.ctaText ? ` · CTA: ${slide.ctaText} (${slide.ctaUrl})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={togglingId === slide.id}
                            onClick={() => handleToggleStatus(slide)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                              slide.isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>{slide.isActive ? 'Disable' : 'Enable'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(slide)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] px-2.5 py-1.5 text-xs font-semibold text-[#101B35] hover:bg-slate-50"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(slide)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Create / Edit Slide Modal */}
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingSlide ? 'Edit Checkout Hero Slide' : 'Create Checkout Hero Slide'}
            description="Configure headline, imagery, alignment, optional CTA, and schedule for the Checkout Hero Slider."
            size="lg"
          >
            <form onSubmit={handleSaveSlide} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Pill Badge *</label>
                  <input
                    required
                    value={slideForm.badgeText}
                    onChange={(e) => setSlideForm((f) => ({ ...f, badgeText: e.target.value }))}
                    placeholder="Secure & Easy Checkout"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Text Alignment</label>
                  <select
                    value={slideForm.textAlignment}
                    onChange={(e) =>
                      setSlideForm((f) => ({
                        ...f,
                        textAlignment: e.target.value as HeroSlideAlignment,
                      }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  >
                    <option value="left">Left (Classic Split)</option>
                    <option value="center">Center (Full Backdrop)</option>
                    <option value="right">Right (Mirrored Split)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Primary Headline *</label>
                  <input
                    required
                    value={slideForm.heading}
                    onChange={(e) => setSlideForm((f) => ({ ...f, heading: e.target.value }))}
                    placeholder="Complete Your Order"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Accent Line 2 (Blue Highlight)
                  </label>
                  <input
                    value={slideForm.headlineLine2}
                    onChange={(e) => setSlideForm((f) => ({ ...f, headlineLine2: e.target.value }))}
                    placeholder="Quickly & Securely!"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Subtitle</label>
                <textarea
                  rows={2}
                  value={slideForm.subtitle}
                  onChange={(e) => setSlideForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Shop with Confidence – Your Satisfaction is Our Priority."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Button Label (Leave blank for clean banner)
                  </label>
                  <input
                    value={slideForm.ctaText}
                    onChange={(e) => setSlideForm((f) => ({ ...f, ctaText: e.target.value }))}
                    placeholder="Optional button text"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Button Link URL</label>
                  <input
                    value={slideForm.ctaUrl}
                    onChange={(e) => setSlideForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="/shop"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    Upload via Cloudinary or apply default NOVARA checkout shield artwork
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideForm((f) => ({
                        ...f,
                        desktopImageUrl: DEFAULT_CHECKOUT_SHOWCASE_IMAGE,
                        cloudinaryPublicId: '',
                      }))
                    }
                    className="text-[11px] font-semibold text-[#145CFF] hover:underline"
                  >
                    Use Default Checkout Showcase
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <CloudinaryImageField
                    label="Desktop Slide Image *"
                    folder="hero-slides"
                    value={slideForm.desktopImageUrl}
                    onChange={(url, publicId) =>
                      setSlideForm((f) => ({
                        ...f,
                        desktopImageUrl: url,
                        cloudinaryPublicId: url ? (publicId ?? f.cloudinaryPublicId) : '',
                      }))
                    }
                  />
                  <CloudinaryImageField
                    label="Mobile Image (Optional)"
                    folder="hero-slides"
                    value={slideForm.mobileImageUrl}
                    onChange={(url) => setSlideForm((f) => ({ ...f, mobileImageUrl: url }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Overlay Opacity ({slideForm.overlayOpacity}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    value={slideForm.overlayOpacity}
                    onChange={(e) =>
                      setSlideForm((f) => ({ ...f, overlayOpacity: Number(e.target.value || 0) }))
                    }
                    className="mt-2 w-full accent-[#145CFF]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Sort Order</label>
                  <input
                    type="number"
                    value={slideForm.sortOrder}
                    onChange={(e) =>
                      setSlideForm((f) => ({ ...f, sortOrder: Number(e.target.value || 0) }))
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
                <label className="mt-5 flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slideForm.isActive}
                    onChange={(e) => setSlideForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>Slide Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Schedule Start (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={slideForm.startsAt}
                    onChange={(e) => setSlideForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Schedule End (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={slideForm.endsAt}
                    onChange={(e) => setSlideForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlide}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSlide ? 'Saving...' : editingSlide ? 'Save Changes' : 'Create Slide'}</span>
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
            title="Delete Checkout Hero Slide"
            message={`Delete "${deleteTarget?.heading}" from the Checkout Page Hero Slider?`}
            confirmLabel="Delete Slide"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
