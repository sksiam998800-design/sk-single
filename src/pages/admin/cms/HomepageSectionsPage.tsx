import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  GripVertical,
  Layers,
  Plus,
  Rocket,
  Save,
  Trash2,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards, StatusBadge } from '../../../components/admin/ui';
import { HomepageLayoutPreviewModal } from '../../../components/admin/homepage/HomepageLayoutPreviewModal';
import {
  BANNER_PLACEMENT_OPTIONS,
  DEFAULT_HOMEPAGE_LAYOUT_SECTIONS,
  getWidthModeLabel,
  normalizeHomepageLayoutSections,
  type BannerPlacement,
  type BannerWidthMode,
  type HomepageSectionType,
  type ProductSourceMode,
} from '../../../lib/bannerBuilder';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type {
  BannerRecord,
  BrandItem,
  CategoryItem,
  HomepageLayoutRecord,
  HomepageLayoutSection,
  ProductItem,
} from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

const SECTION_TYPE_CATALOG: Array<{
  type: HomepageSectionType;
  label: string;
  description: string;
}> = [
  { type: 'hero_slider', label: 'Hero Slider', description: 'Primary full-width campaign carousel' },
  { type: 'dynamic_banner', label: 'Dynamic Banner Slot', description: 'Render banners from any placement slot or IDs' },
  { type: 'promo_bento', label: 'Promo Bento Grid', description: '3-card promotional bento showcase' },
  { type: 'featured_categories', label: 'Featured Categories', description: 'Horizontal category shortcut carousel' },
  { type: 'best_sellers', label: 'Best Sellers', description: 'Top-selling published products' },
  { type: 'featured_products', label: 'Featured Products', description: 'Curated featured product grid' },
  { type: 'new_arrivals', label: 'New Arrivals', description: 'Fresh releases and newest drops' },
  { type: 'latest_products', label: 'Latest Products', description: 'Recently added catalog inventory' },
  { type: 'trending_products', label: 'Trending Products', description: 'High-engagement trending catalog' },
  { type: 'product_collection', label: 'Filterable Collection', description: 'Tabbed category collection grid' },
  { type: 'brand_showcase', label: 'Brand Showcase', description: 'Featured verified storefront brands' },
  { type: 'feature_banners', label: 'Customer Perks & Trust', description: 'Gift threshold & quality guarantee cards' },
  { type: 'promotional_ad', label: 'Promotional Ad / Mid Banner', description: 'Mid-page dynamic banner & ad placement' },
  { type: 'custom_content', label: 'Custom Content Block', description: 'Editorial story block with image and CTA' },
  { type: 'testimonials', label: 'Customer Testimonials', description: 'Verified buyer reviews' },
  { type: 'newsletter', label: 'Newsletter CTA', description: 'Deals alert & offer subscription strip' },
];

export function HomepageSectionsPage() {
  useSeoMeta({ title: 'Homepage Layout Builder | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [layout, setLayout] = useState<HomepageLayoutRecord | null>(null);
  const [sections, setSections] = useState<HomepageLayoutSection[]>(DEFAULT_HOMEPAGE_LAYOUT_SECTIONS);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_HOMEPAGE_LAYOUT_SECTIONS[0].sectionId);

  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [layoutRes, bannerRes, catRes, brandRes, prodRes] = await Promise.all([
        apiRequest<{ ok: true; layout: HomepageLayoutRecord }>('/api/admin/homepage-layout'),
        apiRequest<{ ok: true; banners: BannerRecord[] }>('/api/admin/banners').catch(() => ({ ok: true as const, banners: [] })),
        apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories').catch(() => ({ ok: true as const, categories: [] })),
        apiRequest<{ ok: true; brands: BrandItem[] }>('/api/admin/brands').catch(() => ({ ok: true as const, brands: [] })),
        apiRequest<{ ok: true; products: ProductItem[] }>('/api/products?limit=24').catch(() => ({ ok: true as const, products: [] })),
      ]);
      const loadedSections = normalizeHomepageLayoutSections(
        layoutRes.layout?.draftSections?.length
          ? layoutRes.layout.draftSections
          : DEFAULT_HOMEPAGE_LAYOUT_SECTIONS,
      );
      setLayout(layoutRes.layout);
      setSections(loadedSections);
      setSelectedId((prev) =>
        loadedSections.some((s) => s.sectionId === prev)
          ? prev
          : loadedSections[0]?.sectionId || '',
      );
      setBanners(bannerRes.banners || []);
      setCategories(catRes.categories || []);
      setBrands(brandRes.brands || []);
      setProducts(prodRes.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load homepage layout.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedSection = sections.find((s) => s.sectionId === selectedId) || sections[0] || null;

  const updateSelected = (updater: (sec: HomepageLayoutSection) => HomepageLayoutSection) => {
    if (!selectedSection) return;
    setSections((prev) =>
      prev.map((s) => (s.sectionId === selectedSection.sectionId ? updater(s) : s)),
    );
  };

  const moveSection = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= sections.length) return;
    const next = sections.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setSections(next.map((s, i) => ({ ...s, displayOrder: i })));
  };

  const handleDropSection = (targetId: string) => {
    if (!draggedSectionId || draggedSectionId === targetId) return;
    const fromIdx = sections.findIndex((s) => s.sectionId === draggedSectionId);
    const toIdx = sections.findIndex((s) => s.sectionId === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = sections.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDraggedSectionId(null);
    setSections(next.map((s, i) => ({ ...s, displayOrder: i })));
  };

  const addNewSection = (type: HomepageSectionType, defaultLabel: string) => {
    const id = `sec_${type}_${Date.now().toString(36).slice(-4)}`;
    const newSec: HomepageLayoutSection = {
      sectionId: id,
      sectionType: type,
      title: defaultLabel,
      subtitle: '',
      enabled: true,
      displayOrder: sections.length,
      widthMode: 'full',
      customWidthPercent: 100,
      layoutSettings: {
        desktopCols: type === 'dynamic_banner' || type === 'custom_content' ? 1 : 8,
        tabletCols: type === 'dynamic_banner' ? 1 : 4,
        mobileCols: type === 'dynamic_banner' ? 1 : 2,
        paddingY: 8,
        backgroundColor: '',
        backgroundGradient: '',
        contentAlign: 'left',
      },
      contentSettings: {
        badgeText: '',
        bodyText: '',
        imageUrl: '',
        ctaLabel: 'Explore',
        ctaUrl: '/shop',
      },
      sourceReferences: {
        productSourceMode:
          type === 'best_sellers'
            ? 'bestsellers'
            : type === 'new_arrivals'
              ? 'new_arrivals'
              : type === 'trending_products'
                ? 'trending'
                : type === 'latest_products'
                  ? 'latest'
                  : 'featured',
        productIds: [],
        productCount: 8,
        sortBy: 'popular',
        bannerPlacement: 'between_sections',
        bannerIds: [],
      },
      visibilitySettings: { desktop: true, tablet: true, mobile: true, startsAt: null, endsAt: null },
    };
    setSections((prev) => [...prev, newSec]);
    setSelectedId(id);
    setAddModalOpen(false);
  };

  const duplicateSection = (sec: HomepageLayoutSection) => {
    const id = `${sec.sectionId}_copy_${Date.now().toString(36).slice(-3)}`;
    const clone: HomepageLayoutSection = {
      ...sec,
      sectionId: id,
      title: `${sec.title} (Copy)`,
      displayOrder: sections.length,
    };
    setSections((prev) => [...prev, clone]);
    setSelectedId(id);
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      dispatch(showToast({ variant: 'error', message: 'At least one section must remain in the layout.' }));
      return;
    }
    const next = sections.filter((s) => s.sectionId !== sectionId).map((s, i) => ({ ...s, displayOrder: i }));
    setSections(next);
    if (selectedId === sectionId) {
      setSelectedId(next[0]?.sectionId || '');
    }
  };

  const saveDraft = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const normalized = sections.map((s, idx) => ({ ...s, displayOrder: idx }));
      const res = await apiRequest<{ ok: true; layout: HomepageLayoutRecord }>('/api/admin/homepage-layout', {
        method: 'PUT',
        body: JSON.stringify({ sections: normalized }),
      });
      setLayout(res.layout);
      setSections(res.layout.draftSections);
      dispatch(showToast({ variant: 'success', message: 'Homepage draft layout saved.' }));
      return true;
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save draft failed.' }));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const savedOk = await saveDraft();
      if (!savedOk) return;
      const res = await apiRequest<{ ok: true; layout: HomepageLayoutRecord }>(
        '/api/admin/homepage-layout/publish',
        { method: 'POST' },
      );
      setLayout(res.layout);
      dispatch(
        showToast({
          variant: 'success',
          message: `Published Homepage Layout v${res.layout.layoutVersion} live to storefront!`,
        }),
      );
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Publish failed.' }));
    } finally {
      setPublishing(false);
    }
  };

  const isProductSection =
    selectedSection &&
    [
      'best_sellers',
      'featured_products',
      'new_arrivals',
      'latest_products',
      'trending_products',
      'product_collection',
    ].includes(selectedSection.sectionType);

  const isBannerSection =
    selectedSection &&
    ['dynamic_banner', 'promo_bento', 'promotional_ad'].includes(selectedSection.sectionType);

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Visual Homepage Layout Builder"
            subtitle="Arrange storefront sections, assign dynamic banners & product sources, preview changes, and publish live."
            breadcrumbs={[{ label: 'Content Management' }, { label: 'Homepage Layout' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {layout && (
                  <StatusBadge
                    label={`v${layout.layoutVersion || 1} · ${layout.status === 'published' ? 'Published' : 'Unpublished Draft'}`}
                    tone={layout.status === 'published' ? 'emerald' : 'amber'}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] bg-white px-3.5 py-2 text-xs font-semibold text-[#0A1F44] hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 text-[#145CFF]" /> Preview Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveDraft()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6F7] bg-[#F4F8FF] px-3.5 py-2 text-xs font-semibold text-[#145CFF] hover:bg-[#EAF1FF] disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0E47D9] disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Rocket className="h-3.5 w-3.5" /> {publishing ? 'Publishing...' : 'Publish Layout'}
                </button>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadAll} />}

          {loading ? (
            <LoadingCards count={3} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 5 Cols: Ordered Section List */}
              <div className="lg:col-span-5 rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-sm font-extrabold text-[#0A1F44]">
                      Page Sections ({sections.length})
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Drag rows or use arrows to reorder the live storefront sequence
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9] whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Section
                  </button>
                </div>

                <div className="space-y-2">
                  {sections.map((sec, idx) => {
                    const isSelected = selectedSection?.sectionId === sec.sectionId;
                    return (
                      <div
                        key={sec.sectionId}
                        draggable
                        onDragStart={() => setDraggedSectionId(sec.sectionId)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropSection(sec.sectionId)}
                        onClick={() => setSelectedId(sec.sectionId)}
                        className={`cursor-pointer rounded-xl border p-3 transition-all ${
                          isSelected
                            ? 'border-[#145CFF] bg-[#EEF4FF]/70 ring-1 ring-[#145CFF]/25'
                            : 'border-[#E4EAF5] bg-[#F8FAFF] hover:border-blue-200'
                        } ${!sec.enabled ? 'opacity-65' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono-tabular text-[10px] font-bold text-[#145CFF]">
                                  #{idx + 1}
                                </span>
                                <span className="truncate text-xs font-bold text-[#0A1F44]">
                                  {sec.title}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#64748B]">
                                <span className="rounded bg-white px-1.5 py-0.5 font-semibold border border-[#E4EAF5]">
                                  {sec.sectionType.replace(/_/g, ' ')}
                                </span>
                                <span className="rounded bg-white px-1.5 py-0.5 font-medium border border-[#E4EAF5]">
                                  {getWidthModeLabel(sec.widthMode, sec.customWidthPercent)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, -1)}
                              aria-label="Move section up"
                              className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-[#145CFF] disabled:opacity-25"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === sections.length - 1}
                              onClick={() => moveSection(idx, 1)}
                              aria-label="Move section down"
                              className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-[#145CFF] disabled:opacity-25"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.sectionId === sec.sectionId ? { ...s, enabled: !s.enabled } : s,
                                  ),
                                )
                              }
                              aria-label={sec.enabled ? 'Disable section' : 'Enable section'}
                              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                sec.enabled
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {sec.enabled ? 'On' : 'Off'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 7 Cols: Section Inspector */}
              <div className="lg:col-span-7 rounded-2xl border border-[#E4EAF5] bg-white p-5 shadow-xs space-y-5">
                {selectedSection ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAF5] pb-3.5">
                      <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#145CFF]">
                          Section Inspector
                        </div>
                        <h3 className="font-display text-base font-extrabold text-[#0A1F44]">
                          {selectedSection.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateSection(selectedSection)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-slate-50"
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSection(selectedSection.sectionId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Basic Identity & Enable */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                          Section Heading *
                        </label>
                        <input
                          value={selectedSection.title}
                          onChange={(e) => updateSelected((s) => ({ ...s, title: e.target.value }))}
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                          Subtitle
                        </label>
                        <input
                          value={selectedSection.subtitle}
                          onChange={(e) => updateSelected((s) => ({ ...s, subtitle: e.target.value }))}
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs"
                        />
                      </div>
                    </div>

                    {/* Width & Layout Settings */}
                    <div className="rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-4 space-y-3">
                      <div className="text-xs font-bold text-[#0A1F44]">Layout Width &amp; Appearance</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Width Mode</label>
                          <select
                            value={selectedSection.widthMode}
                            onChange={(e) =>
                              updateSelected((s) => ({ ...s, widthMode: e.target.value as BannerWidthMode }))
                            }
                            className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 text-xs"
                          >
                            <option value="full">Full (100%)</option>
                            <option value="half">Half (50%)</option>
                            <option value="one_third">1/3 Width (33%)</option>
                            <option value="two_thirds">2/3 Width (67%)</option>
                            <option value="custom">Custom %</option>
                          </select>
                        </div>
                        {selectedSection.widthMode === 'custom' && (
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Custom %</label>
                            <input
                              type="number"
                              min={15}
                              max={100}
                              value={selectedSection.customWidthPercent}
                              onChange={(e) =>
                                updateSelected((s) => ({ ...s, customWidthPercent: Number(e.target.value) }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 font-mono-tabular text-xs"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Padding Y (px)</label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={selectedSection.layoutSettings.paddingY}
                            onChange={(e) =>
                              updateSelected((s) => ({
                                ...s,
                                layoutSettings: { ...s.layoutSettings, paddingY: Number(e.target.value) },
                              }))
                            }
                            className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 font-mono-tabular text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Bg Color</label>
                          <input
                            value={selectedSection.layoutSettings.backgroundColor}
                            onChange={(e) =>
                              updateSelected((s) => ({
                                ...s,
                                layoutSettings: { ...s.layoutSettings, backgroundColor: e.target.value },
                              }))
                            }
                            placeholder="#FFFFFF or blank"
                            className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 font-mono-tabular text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {(['desktop', 'tablet', 'mobile'] as const).map((dev) => (
                          <label key={dev} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155] capitalize">
                            <input
                              type="checkbox"
                              checked={selectedSection.visibilitySettings[dev]}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  visibilitySettings: { ...s.visibilitySettings, [dev]: e.target.checked },
                                }))
                              }
                              className="h-3.5 w-3.5 rounded text-[#145CFF]"
                            />
                            Show on {dev}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Banner Source Linking */}
                    {isBannerSection && (
                      <div className="rounded-xl border border-[#DCE6F7] bg-[#F4F8FF] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0A1F44]">Dynamic Banner Assignment</span>
                          <Link
                            to="/admin/banners"
                            className="text-[11px] font-semibold text-[#145CFF] hover:underline"
                          >
                            Manage Dynamic Banners →
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#475569] mb-1">
                              Render Placement Slot
                            </label>
                            <select
                              value={selectedSection.sourceReferences.bannerPlacement || 'between_sections'}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: {
                                    ...s.sourceReferences,
                                    bannerPlacement: e.target.value as BannerPlacement,
                                  },
                                }))
                              }
                              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-white px-3 text-xs"
                            >
                              {BANNER_PLACEMENT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#475569] mb-1">
                              Specific Banner IDs (Optional override)
                            </label>
                            <select
                              multiple
                              value={selectedSection.sourceReferences.bannerIds || []}
                              onChange={(e) => {
                                const selectedIds = Array.from(e.target.selectedOptions).map((o) => o.value);
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: { ...s.sourceReferences, bannerIds: selectedIds },
                                }));
                              }}
                              className="w-full h-20 rounded-xl border border-[#E4EAF5] bg-white p-1.5 text-xs"
                            >
                              {banners.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name || b.title} ({b.placement})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Product Source References */}
                    {isProductSection && (
                      <div className="rounded-xl border border-[#DCE6F7] bg-[#F4F8FF] p-4 space-y-3">
                        <div className="text-xs font-bold text-[#0A1F44]">Dynamic Product Data Source</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">Source Mode</label>
                            <select
                              value={selectedSection.sourceReferences.productSourceMode}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: {
                                    ...s.sourceReferences,
                                    productSourceMode: e.target.value as ProductSourceMode,
                                  },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 text-xs"
                            >
                              <option value="bestsellers">Best Sellers</option>
                              <option value="featured">Featured Flag</option>
                              <option value="new_arrivals">New Arrivals</option>
                              <option value="trending">Trending</option>
                              <option value="latest">Latest Products</option>
                              <option value="category">Specific Category</option>
                              <option value="brand">Specific Brand</option>
                              <option value="manual">Manual Product Pick</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">Product Count</label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={selectedSection.sourceReferences.productCount}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: {
                                    ...s.sourceReferences,
                                    productCount: Math.max(1, Math.min(24, Number(e.target.value))),
                                  },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 font-mono-tabular text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">Sort Order</label>
                            <select
                              value={selectedSection.sourceReferences.sortBy}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: {
                                    ...s.sourceReferences,
                                    sortBy: e.target.value as 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'rating',
                                  },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 text-xs"
                            >
                              <option value="popular">Popularity</option>
                              <option value="newest">Newest First</option>
                              <option value="rating">Highest Rated</option>
                              <option value="price_asc">Price: Low to High</option>
                              <option value="price_desc">Price: High to Low</option>
                            </select>
                          </div>
                        </div>

                        {selectedSection.sourceReferences.productSourceMode === 'category' && (
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">Category</label>
                            <select
                              value={selectedSection.sourceReferences.categorySlug || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: { ...s.sourceReferences, categorySlug: e.target.value },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 text-xs"
                            >
                              <option value="">Choose category...</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedSection.sourceReferences.productSourceMode === 'brand' && (
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">Brand</label>
                            <select
                              value={selectedSection.sourceReferences.brandSlug || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  sourceReferences: { ...s.sourceReferences, brandSlug: e.target.value },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2 text-xs"
                            >
                              <option value="">Choose brand...</option>
                              {brands.map((b) => (
                                <option key={b.id} value={b.slug}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedSection.sourceReferences.productSourceMode === 'manual' && (
                          <div>
                            <label className="block text-[10px] font-semibold text-[#475569] mb-1">
                              Manual Products ({selectedSection.sourceReferences.productIds.length} selected)
                            </label>
                            <div className="max-h-36 overflow-y-auto rounded-lg border border-[#E4EAF5] bg-white p-2 space-y-1">
                              {products.map((p) => {
                                const checked = selectedSection.sourceReferences.productIds.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        updateSelected((s) => ({
                                          ...s,
                                          sourceReferences: {
                                            ...s.sourceReferences,
                                            productIds: e.target.checked
                                              ? [...s.sourceReferences.productIds, p.id]
                                              : s.sourceReferences.productIds.filter((id) => id !== p.id),
                                          },
                                        }))
                                      }
                                    />
                                    <span className="truncate font-medium">{p.name}</span>
                                    <span className="ml-auto font-mono-tabular text-[11px] text-[#64748B]">
                                      ৳{p.currentPrice}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Content Editor */}
                    {selectedSection.sectionType === 'custom_content' && (
                      <div className="rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-4 space-y-3">
                        <div className="text-xs font-bold text-[#0A1F44]">Custom Editorial Content</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Badge Text</label>
                            <input
                              value={selectedSection.contentSettings.badgeText || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  contentSettings: { ...s.contentSettings, badgeText: e.target.value },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Image URL</label>
                            <input
                              value={selectedSection.contentSettings.imageUrl || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  contentSettings: { ...s.contentSettings, imageUrl: e.target.value },
                                }))
                              }
                              placeholder="/src/assets/images/..."
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2.5 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Body Copy</label>
                          <textarea
                            rows={2}
                            value={selectedSection.contentSettings.bodyText || ''}
                            onChange={(e) =>
                              updateSelected((s) => ({
                                ...s,
                                contentSettings: { ...s.contentSettings, bodyText: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-[#E4EAF5] bg-white p-2.5 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">CTA Label</label>
                            <input
                              value={selectedSection.contentSettings.ctaLabel || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  contentSettings: { ...s.contentSettings, ctaLabel: e.target.value },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">CTA URL</label>
                            <input
                              value={selectedSection.contentSettings.ctaUrl || ''}
                              onChange={(e) =>
                                updateSelected((s) => ({
                                  ...s,
                                  contentSettings: { ...s.contentSettings, ctaUrl: e.target.value },
                                }))
                              }
                              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-white px-2.5 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 text-[11px] text-[#64748B]">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Section ID: <code className="font-mono-tabular">{selectedSection.sectionId}</code>
                      </span>
                      <span>Save Draft or Publish Layout to apply changes</span>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-[#64748B]">
                    <Layers className="mx-auto mb-2 h-6 w-6 text-[#145CFF]" />
                    Select a section on the left to inspect and configure its layout properties.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Section Picker Modal */}
          {addModalOpen && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
              onClick={() => setAddModalOpen(false)}
            >
              <div
                className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-[#0A1F44]">Add Homepage Section</h3>
                    <p className="text-xs text-[#64748B]">
                      Choose a storefront module to append to your homepage layout
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="rounded-lg border border-[#E4EAF5] px-3 py-1 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto">
                  {SECTION_TYPE_CATALOG.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addNewSection(item.type, item.label)}
                      className="rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-3 text-left transition-colors hover:border-[#145CFF] hover:bg-[#EEF4FF]"
                    >
                      <div className="text-xs font-bold text-[#0A1F44]">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-[#64748B]">{item.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <HomepageLayoutPreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            sections={sections}
            banners={banners}
            sampleProducts={products.slice(0, 8)}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
