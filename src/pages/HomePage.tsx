import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Flame, RefreshCw } from 'lucide-react';
import { apiRequest, ApiError, isAbortError } from '../services/api';
import type {
  BannerRecord,
  BrandItem,
  CategoryItem,
  HomepageConfigData,
  HomepageLayoutSection,
  ProductItem,
  PromotionalAdData,
  PromotionalCampaignItem,
} from '../types/commerce';
import { ProductCard } from '../components/catalog/ProductCard';
import { ResilientImage } from '../components/ui/ResilientImage';
import { DynamicBannerGroup } from '../components/banners/DynamicBannerRenderer';
import {
  HomepageSectionRenderer,
  type HomepageRenderContext,
} from '../components/homepage/HomepageSectionRenderer';
import {
  DEFAULT_HOMEPAGE_LAYOUT_SECTIONS,
  normalizeHomepageLayoutSections,
} from '../lib/bannerBuilder';
import { useSeoMeta } from '../lib/useSeoMeta';

interface TestimonialItem {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  product?: { name?: string; slug?: string };
}

interface CustomHomepageSection {
  key: string;
  title: string;
  subtitle?: string;
  sortOrder: number;
  products: ProductItem[];
}

interface HomepagePayload {
  ok: true;
  config: HomepageConfigData | null;
  publishedLayout?: {
    name: string;
    layoutVersion: number;
    publishedAt?: string | null;
    sections: HomepageLayoutSection[];
  };
  sectionProducts?: Record<string, ProductItem[]>;
  banners?: BannerRecord[];
  bannersByPlacement?: Record<string, BannerRecord[]>;
  categories: CategoryItem[];
  brands?: BrandItem[];
  featuredProducts?: ProductItem[];
  latestProducts?: ProductItem[];
  bestSellers: ProductItem[];
  trendingProducts?: ProductItem[];
  newArrivals?: ProductItem[];
  premiumCollection: ProductItem[];
  homepageSections?: CustomHomepageSection[];
  testimonials: TestimonialItem[];
  promotionalAd: PromotionalAdData | null;
  promotionalAds?: PromotionalAdData[];
  campaigns?: PromotionalCampaignItem[];
}

const FALLBACK_HERO_SLIDES = [
  {
    badgeText: 'Up to 50% OFF',
    headlineLine1: 'Smart Technology',
    headlineLine2: 'Better Life',
    subtitle: 'Discover the latest gadgets and upgrade your lifestyle with NOVARA.',
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop',
    imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
    mobileImageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
    isActive: true,
  },
];

const FALLBACK_PROMO_CARDS: HomepageConfigData['promoBentoCards'] = [
  {
    eyebrow: 'Big Sale',
    title: 'UP TO 70% OFF',
    subtitle: "Don't Miss Out!",
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop?discount=true',
    imageUrl: '/src/assets/images/promo_headphones_1794832024152.jpg',
    theme: 'royal-blue' as const,
  },
  {
    eyebrow: 'New Arrivals',
    title: 'Explore the Latest Trends',
    subtitle: 'Fashion · Tech · Lifestyle',
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop?sort=newest',
    imageUrl: '/src/assets/images/promo_sneakers_1794832025309.jpg',
    theme: 'ice-blue' as const,
  },
  {
    eyebrow: 'Premium Quality',
    title: 'Smart Devices',
    subtitle: 'Innovate Your Life',
    ctaLabel: 'Shop Now',
    ctaUrl: '/category/smart-watches',
    imageUrl: '/src/assets/images/promo_smartwatch_1794832026084.jpg',
    theme: 'midnight-navy' as const,
  },
];

const DEFAULT_CATEGORY_SHORTCUTS: Array<Pick<CategoryItem, 'id' | 'name' | 'slug' | 'iconName'>> = [
  { id: 'c1', name: 'Mobiles & Tablets', slug: 'mobiles-tablets', iconName: 'Smartphone' },
  { id: 'c2', name: 'Laptops & Computers', slug: 'laptops-computers', iconName: 'Laptop' },
  { id: 'c3', name: 'Audio & Headphones', slug: 'audio-headphones', iconName: 'Headphones' },
  { id: 'c4', name: 'Smart Watches', slug: 'smart-watches', iconName: 'Watch' },
  { id: 'c5', name: 'Cameras & Drones', slug: 'cameras-drones', iconName: 'Camera' },
  { id: 'c6', name: 'Gaming & Consoles', slug: 'gaming-consoles', iconName: 'Gamepad2' },
  { id: 'c7', name: 'Home Appliances', slug: 'home-appliances', iconName: 'Home' },
  { id: 'c8', name: 'Fashion & Lifestyle', slug: 'fashion-lifestyle', iconName: 'Shirt' },
  { id: 'c9', name: 'Bags & Wallets', slug: 'bags-wallets', iconName: 'ShoppingBag' },
  { id: 'c10', name: 'Books & Education', slug: 'books-education', iconName: 'BookOpen' },
];

export function HomePage() {
  const [data, setData] = useState<HomepagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ code: string; message: string } | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'electronics' | 'fashion' | 'home' | 'books'>('all');
  const categoryStripRef = useRef<HTMLDivElement>(null);

  useSeoMeta({
    title:
      data?.config?.seoDefaults?.defaultTitle ||
      'NOVARA COMMERCE – Smart Technology & Lifestyle Store Bangladesh',
    description:
      data?.config?.seoDefaults?.defaultDescription ||
      'Shop genuine electronics, fashion, books, and home essentials across Bangladesh with fast nationwide delivery and secure checkout.',
  });

  const loadHomepage = async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await apiRequest<HomepagePayload>('/api/storefront/homepage', { signal });
      setData(res);
    } catch (err) {
      if (isAbortError(err)) return;
      if (err instanceof ApiError) {
        setErrorState({ code: err.code, message: err.message });
      } else {
        setErrorState({ code: 'NETWORK_ERROR', message: 'Unable to load storefront data.' });
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadHomepage(controller.signal);
    return () => controller.abort();
  }, []);

  const trackAdClick = (adId?: string) => {
    if (!adId) return;
    fetch(`/api/storefront/ads/${adId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click' }),
    }).catch(() => undefined);
  };

  const hasLiveConfig = Boolean(!loading && !errorState && data?.config);
  const slides = hasLiveConfig
    ? (data?.config?.heroSlides || []).filter((s) => s.isActive !== false)
    : FALLBACK_HERO_SLIDES;

  const promoCards = hasLiveConfig ? data?.config?.promoBentoCards || [] : FALLBACK_PROMO_CARDS;
  const categories =
    hasLiveConfig
      ? data?.categories || []
      : data?.categories && data.categories.length > 0
        ? data.categories
        : DEFAULT_CATEGORY_SHORTCUTS;

  const bestSellers = Array.isArray(data?.bestSellers) ? data.bestSellers : [];
  const featuredProducts = Array.isArray(data?.featuredProducts) ? data.featuredProducts : [];
  const latestProducts = Array.isArray(data?.latestProducts) ? data.latestProducts : [];
  const newArrivals = Array.isArray(data?.newArrivals) ? data.newArrivals : [];
  const trendingProducts = Array.isArray(data?.trendingProducts) ? data.trendingProducts : [];
  const customSections = Array.isArray(data?.homepageSections) ? data.homepageSections : [];
  const activeCampaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
  const allBanners = Array.isArray(data?.banners) ? data.banners : [];

  const bannersByPlacement = useMemo(() => {
    if (data?.bannersByPlacement) return data.bannersByPlacement;
    const grouped: Record<string, BannerRecord[]> = {};
    for (const b of allBanners) {
      const k = b.placement || 'custom';
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(b);
    }
    return grouped;
  }, [data?.bannersByPlacement, allBanners]);

  const extraBottomAds = (Array.isArray(data?.promotionalAds) ? data.promotionalAds : []).filter(
    (ad) =>
      ad.id !== data?.promotionalAd?.id &&
      (ad.placement === 'homepage_bottom' || ad.placement === 'promo_section'),
  );

  const hasAnyCatalogProducts =
    bestSellers.length > 0 ||
    featuredProducts.length > 0 ||
    latestProducts.length > 0 ||
    newArrivals.length > 0 ||
    trendingProducts.length > 0 ||
    customSections.length > 0 ||
    (data?.premiumCollection?.length ?? 0) > 0;

  const scrollCategories = (dir: -1 | 1) => {
    categoryStripRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const enabledSections = data?.config?.enabledSections || {};
  const layoutSections = useMemo(() => {
    const raw =
      data?.publishedLayout?.sections && data.publishedLayout.sections.length > 0
        ? data.publishedLayout.sections
        : DEFAULT_HOMEPAGE_LAYOUT_SECTIONS;

    return normalizeHomepageLayoutSections(raw).filter((sec) => {
      if (!sec.enabled) return false;
      // Preserve compatibility with legacy enabledSections flags if set explicitly to false
      if (sec.sectionType === 'hero_slider' && enabledSections.hero === false) return false;
      if (sec.sectionType === 'featured_categories' && enabledSections.categories === false) return false;
      if (sec.sectionType === 'promo_bento' && enabledSections.promoBento === false) return false;
      if (sec.sectionType === 'best_sellers' && enabledSections.bestSellers === false) return false;
      if (sec.sectionType === 'feature_banners' && enabledSections.featureBanners === false) return false;
      if (sec.sectionType === 'product_collection' && enabledSections.premiumCollection === false) return false;
      if (sec.sectionType === 'featured_products' && enabledSections.featuredProducts === false) return false;
      if (sec.sectionType === 'new_arrivals' && enabledSections.newArrivals === false) return false;
      if (sec.sectionType === 'trending_products' && enabledSections.trendingProducts === false) return false;
      if (sec.sectionType === 'testimonials' && (enabledSections.testimonials === false || enabledSections.reviews === false)) {
        return false;
      }
      return true;
    });
  }, [data?.publishedLayout?.sections, enabledSections]);

  const renderCtx: HomepageRenderContext = {
    config: data?.config || null,
    slides,
    activeSlide,
    setActiveSlide,
    promoCards,
    categories,
    brands: data?.brands || [],
    banners: allBanners,
    bannersByPlacement,
    featuredProducts,
    latestProducts,
    bestSellers,
    trendingProducts,
    newArrivals,
    premiumCollection: Array.isArray(data?.premiumCollection) ? data.premiumCollection : [],
    sectionProducts: data?.sectionProducts || {},
    testimonials: Array.isArray(data?.testimonials) ? data.testimonials : [],
    promotionalAd: data?.promotionalAd || null,
    promotionalAds: Array.isArray(data?.promotionalAds) ? data.promotionalAds : [],
    collectionFilter,
    setCollectionFilter,
    categoryStripRef,
    scrollCategories,
    onTrackAdClick: trackAdClick,
    loading,
  };

  const { claimedPlacements, claimedBannerIds } = useMemo(() => {
    const placements = new Set<string>();
    const ids = new Set<string>();
    for (const sec of layoutSections) {
      if (sec.sectionType === 'dynamic_banner') {
        if (sec.sourceReferences?.bannerIds?.length) {
          for (const id of sec.sourceReferences.bannerIds) ids.add(String(id));
        } else if (sec.sourceReferences?.bannerPlacement) {
          placements.add(sec.sourceReferences.bannerPlacement);
        }
      } else if (sec.sectionType === 'promotional_ad' && sec.sourceReferences?.bannerPlacement) {
        placements.add(sec.sourceReferences.bannerPlacement);
      }
    }
    return { claimedPlacements: placements, claimedBannerIds: ids };
  }, [layoutSections]);

  const renderPlacementSlot = (placement: string) => {
    if (claimedPlacements.has(placement)) return null;
    const slotBanners = (bannersByPlacement[placement] || []).filter((b) => !claimedBannerIds.has(b.id));
    if (slotBanners.length === 0) return null;
    return (
      <div className="md:col-span-12">
        <DynamicBannerGroup banners={slotBanners} />
      </div>
    );
  };

  return (
    <div className="pb-6">
      <div className="mx-auto max-w-[1380px] space-y-6 px-4 pt-5">
        {/* Non-DB unexpected error banner */}
        {errorState && errorState.code !== 'DATABASE_UNAVAILABLE' && (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F1D3A]">Unable to Load Live Catalog</h2>
                  <p className="mt-1 text-sm text-slate-600">{errorState.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadHomepage()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Published Layout Sections + Slotted Dynamic Banners */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {renderPlacementSlot('above_hero')}
          {renderPlacementSlot('homepage_hero')}

          {layoutSections.map((section) => (
            <div key={section.sectionId} className="contents">
              {section.sectionType === 'featured_categories' && renderPlacementSlot('above_categories')}
              {section.sectionType === 'featured_products' && renderPlacementSlot('above_featured')}
              {section.sectionType === 'best_sellers' && renderPlacementSlot('above_bestsellers')}

              <HomepageSectionRenderer section={section} ctx={renderCtx} />

              {section.sectionType === 'hero_slider' && renderPlacementSlot('below_hero')}
              {section.sectionType === 'featured_categories' && renderPlacementSlot('below_categories')}
              {section.sectionType === 'promo_bento' && renderPlacementSlot('promo_strip')}
              {section.sectionType === 'featured_products' && renderPlacementSlot('below_featured')}
              {section.sectionType === 'best_sellers' && renderPlacementSlot('below_bestsellers')}
              {section.sectionType === 'feature_banners' && renderPlacementSlot('between_sections')}
            </div>
          ))}

          {renderPlacementSlot('promotional_section')}
          {renderPlacementSlot('custom')}
          {renderPlacementSlot('homepage_bottom')}
        </div>

        {/* Flash Sales & Active Campaigns Row */}
        {enabledSections.flashSales !== false && !loading && activeCampaigns.length > 0 && (
          <section aria-labelledby="flash-campaigns-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-1 rounded-full bg-amber-500" aria-hidden="true" />
                <h2 id="flash-campaigns-heading" className="font-display flex items-center gap-2 text-lg font-bold text-[#0B1730] sm:text-xl">
                  <Flame className="h-5 w-5 text-amber-500" />
                  Flash Sales &amp; Active Campaigns
                </h2>
              </div>
              <Link to="/offers" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline">
                <span>All Offers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {activeCampaigns.map((camp) => (
                <Link
                  key={camp.id}
                  to={camp.ctaUrl || '/offers'}
                  className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50/40 p-5 shadow-xs transition-colors hover:border-[#1155EE]"
                >
                  <div>
                    <span className="inline-block rounded-full bg-[#1155EE] px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {camp.badgeText || camp.discountLabel}
                    </span>
                    <h3 className="font-display mt-2.5 text-base font-extrabold text-[#0B1730]">{camp.title}</h3>
                    {camp.subtitle && <p className="mt-1 text-xs text-slate-600">{camp.subtitle}</p>}
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#1155EE]">{camp.discountLabel} →</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Genuine Empty Published Catalog Notice (only when DB is connected and returns 0 products) */}
        {!loading && !errorState && !hasAnyCatalogProducts && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <h2 className="font-display text-lg font-bold text-[#0F1D3A]">No Published Products Yet</h2>
            <p className="mt-1 text-sm text-slate-600">
              Publish products in the Admin Panel to populate Best Sellers, Featured, New Arrivals, and Collection sections.
            </p>
            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
            >
              Browse Shop
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Inline Catalog Unavailable Notice when DB is not connected */}
        {!loading && errorState?.code === 'DATABASE_UNAVAILABLE' && (
          <section className="rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-xs">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="font-display mt-2.5 text-lg font-bold text-[#0F1D3A]">Live Catalog Waiting on Database</h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-slate-600">
              {errorState.message} Once connected, Best Sellers, Featured Products, New Arrivals, Trending Products, and Dynamic Layout sections load directly from MongoDB Atlas.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => loadHomepage()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Catalog
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-[#0F1D3A] hover:bg-slate-50"
              >
                Open Shop Catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* Custom Curated Admin Homepage Shelves */}
        {!loading &&
          customSections.map((section) => (
            <section key={section.key} aria-labelledby={`custom-section-${section.key}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-1 rounded-full bg-[#1155EE]" aria-hidden="true" />
                  <div>
                    <h2 id={`custom-section-${section.key}`} className="font-display text-lg font-bold text-[#0B1730] sm:text-xl">
                      {section.title}
                    </h2>
                    {section.subtitle && <p className="text-xs text-slate-500">{section.subtitle}</p>}
                  </div>
                </div>
                <Link to="/shop" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline">
                  <span>View Shop</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                {section.products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </section>
          ))}

        {/* Extra Bottom Promotional Ads */}
        {extraBottomAds.length > 0 && (
          <section aria-label="Bottom promotions" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {extraBottomAds.map((ad) => (
              <a
                key={ad.id}
                href={ad.destinationUrl}
                onClick={() => trackAdClick(ad.id)}
                className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-opacity hover:opacity-95"
              >
                <ResilientImage
                  src={ad.imageUrl}
                  alt={ad.altText || ad.title}
                  className="max-h-[200px] w-full object-cover"
                />
              </a>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
