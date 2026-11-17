import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Monitor, Smartphone, Tablet, X } from 'lucide-react';
import type { BannerRecord, HomepageLayoutSection, ProductItem } from '../../../types/commerce';
import { HomepageSectionRenderer, type HomepageRenderContext } from '../../homepage/HomepageSectionRenderer';

interface HomepageLayoutPreviewModalProps {
  open: boolean;
  onClose: () => void;
  sections: HomepageLayoutSection[];
  banners: BannerRecord[];
  sampleProducts: ProductItem[];
}

export const HomepageLayoutPreviewModal: React.FC<HomepageLayoutPreviewModalProps> = ({
  open,
  onClose,
  sections,
  banners,
  sampleProducts,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeSlide, setActiveSlide] = useState(0);
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'electronics' | 'fashion' | 'home' | 'books'>('all');
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const bannersByPlacement = useMemo(() => {
    const map: Record<string, BannerRecord[]> = {};
    for (const b of banners) {
      if (!b.isPublished) continue;
      if (!map[b.placement]) map[b.placement] = [];
      map[b.placement].push(b);
    }
    return map;
  }, [banners]);

  if (!open) return null;

  const ctx: HomepageRenderContext = {
    config: null,
    slides: [
      {
        badgeText: 'Up to 50% OFF',
        headlineLine1: 'Smart Technology',
        headlineLine2: 'Better Life',
        subtitle: 'Previewing your drafted homepage layout before publishing live.',
        ctaLabel: 'Shop Now',
        ctaUrl: '/shop',
        imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
        isActive: true,
      },
    ],
    activeSlide,
    setActiveSlide,
    promoCards: [],
    categories: [
      { id: 'c1', name: 'Mobiles & Tablets', slug: 'mobiles-tablets', iconName: 'Smartphone' },
      { id: 'c2', name: 'Laptops & Tech', slug: 'laptops-computers', iconName: 'Laptop' },
      { id: 'c3', name: 'Audio Gear', slug: 'audio-headphones', iconName: 'Headphones' },
      { id: 'c4', name: 'Smart Watches', slug: 'smart-watches', iconName: 'Watch' },
      { id: 'c5', name: 'Fashion', slug: 'fashion-lifestyle', iconName: 'Shirt' },
    ],
    brands: [],
    banners,
    bannersByPlacement,
    featuredProducts: sampleProducts,
    latestProducts: sampleProducts,
    bestSellers: sampleProducts,
    trendingProducts: sampleProducts,
    newArrivals: sampleProducts,
    premiumCollection: sampleProducts,
    sectionProducts: {},
    testimonials: [
      {
        id: 't1',
        userName: 'Rafiqul Islam',
        rating: 5,
        title: 'Authentic Gear',
        comment: 'Super fast Dhaka courier delivery and pristine packaging.',
        isVerifiedPurchase: true,
      },
    ],
    promotionalAd: null,
    promotionalAds: [],
    collectionFilter,
    setCollectionFilter,
    categoryStripRef: stripRef,
    scrollCategories: () => undefined,
    onTrackAdClick: () => undefined,
    loading: false,
    previewMode: true,
  };

  const widthClass =
    viewport === 'mobile'
      ? 'max-w-[390px] mx-auto'
      : viewport === 'tablet'
        ? 'max-w-[780px] mx-auto'
        : 'w-full';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Homepage Draft Layout Preview"
      className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[1320px] flex-col rounded-3xl bg-[#F8FAFF] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4EAF5] bg-white px-6 py-4">
          <div>
            <h3 className="font-display text-base font-extrabold text-[#0A1F44]">
              Homepage Draft Layout Preview
            </h3>
            <p className="text-xs text-[#64748B]">
              Verifying {sections.filter((s) => s.enabled).length} enabled sections before publishing to storefront
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl border border-[#E4EAF5] bg-[#F4F7FF] p-0.5">
              {(
                [
                  { mode: 'desktop', label: 'Desktop preview', icon: Monitor },
                  { mode: 'tablet', label: 'Tablet preview', icon: Tablet },
                  { mode: 'mobile', label: 'Mobile preview', icon: Smartphone },
                ] as const
              ).map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.mode}
                    type="button"
                    aria-label={v.label}
                    onClick={() => setViewport(v.mode)}
                    className={`rounded-lg px-2.5 py-1.5 ${
                      viewport === v.mode ? 'bg-[#145CFF] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Close layout preview"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4EAF5] text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 ${widthClass}`}>
            {sections.map((sec) => (
              <HomepageSectionRenderer key={sec.sectionId} section={sec} ctx={ctx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
