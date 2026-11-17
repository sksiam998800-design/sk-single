import mongoose, { Schema, type Document } from 'mongoose';
import type { BannerPlacement, BannerWidthMode } from '../banners/banner.model';

export type HomepageSectionType =
  | 'hero_slider'
  | 'promo_bento'
  | 'dynamic_banner'
  | 'featured_categories'
  | 'featured_products'
  | 'best_sellers'
  | 'latest_products'
  | 'new_arrivals'
  | 'trending_products'
  | 'product_collection'
  | 'brand_showcase'
  | 'feature_banners'
  | 'promotional_ad'
  | 'custom_content'
  | 'testimonials'
  | 'newsletter';

export type ProductSourceMode =
  | 'bestsellers'
  | 'latest'
  | 'featured'
  | 'new_arrivals'
  | 'trending'
  | 'category'
  | 'brand'
  | 'manual';

export interface IHomepageLayoutSection {
  sectionId: string;
  sectionType: HomepageSectionType;
  title: string;
  subtitle: string;
  enabled: boolean;
  displayOrder: number;
  widthMode: BannerWidthMode;
  customWidthPercent: number;
  layoutSettings: {
    desktopCols: number;
    tabletCols: number;
    mobileCols: number;
    paddingY: number;
    backgroundColor: string;
    backgroundGradient: string;
    contentAlign: 'left' | 'center' | 'right';
  };
  contentSettings: {
    badgeText?: string;
    bodyText?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  sourceReferences: {
    productSourceMode: ProductSourceMode;
    productIds: string[];
    categorySlug?: string;
    brandSlug?: string;
    productCount: number;
    sortBy: 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'rating';
    bannerPlacement?: BannerPlacement;
    bannerIds?: string[];
  };
  visibilitySettings: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };
}

export interface IHomepageLayout extends Document {
  key: string;
  name: string;
  pageType: string;
  layoutVersion: number;
  status: 'draft' | 'published';
  publishedAt?: Date | null;
  draftSections: IHomepageLayoutSection[];
  publishedSections: IHomepageLayoutSection[];
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_SERVER_HOMEPAGE_SECTIONS: IHomepageLayoutSection[] = [
  {
    sectionId: 'sec_hero_slider',
    sectionType: 'hero_slider',
    title: 'Hero Slider',
    subtitle: 'Primary hero campaign showcase',
    enabled: true,
    displayOrder: 0,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 1, tabletCols: 1, mobileCols: 1, paddingY: 0, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_categories',
    sectionType: 'featured_categories',
    title: 'Shop by Category',
    subtitle: 'Explore top departments',
    enabled: true,
    displayOrder: 1,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 3, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 12, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_promo_bento',
    sectionType: 'promo_bento',
    title: 'Promotional Highlights',
    subtitle: 'Curated deals and bento banners',
    enabled: true,
    displayOrder: 2,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 3, tabletCols: 2, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 3, sortBy: 'popular', bannerPlacement: 'hero_bento' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_best_sellers',
    sectionType: 'best_sellers',
    title: 'Best Sellers',
    subtitle: 'Most loved by shoppers across Bangladesh',
    enabled: true,
    displayOrder: 3,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View All Products', ctaUrl: '/shop?sort=popular' },
    sourceReferences: { productSourceMode: 'bestsellers', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_feature_banners',
    sectionType: 'feature_banners',
    title: 'Customer Perks & Guarantees',
    subtitle: 'Gift curation and verified warranty',
    enabled: true,
    displayOrder: 4,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 2, tabletCols: 1, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 2, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_promotional_ad',
    sectionType: 'promotional_ad',
    title: 'Featured Campaign Banner',
    subtitle: 'Scheduled mid-page promotional placement',
    enabled: true,
    displayOrder: 5,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 1, tabletCols: 1, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 1, sortBy: 'popular', bannerPlacement: 'homepage_mid' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_premium_collection',
    sectionType: 'product_collection',
    title: 'Our Premium Collection',
    subtitle: 'Filterable flagship releases & exclusive editions',
    enabled: true,
    displayOrder: 6,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 10, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_featured_products',
    sectionType: 'featured_products',
    title: 'Featured Products',
    subtitle: 'Hand-picked storefront highlights',
    enabled: true,
    displayOrder: 7,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View Featured', ctaUrl: '/shop?section=featured' },
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_new_arrivals',
    sectionType: 'new_arrivals',
    title: 'New Arrivals & Latest',
    subtitle: 'Fresh releases added to NOVARA',
    enabled: true,
    displayOrder: 8,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'Shop New Arrivals', ctaUrl: '/shop?sort=newest' },
    sourceReferences: { productSourceMode: 'new_arrivals', productIds: [], productCount: 8, sortBy: 'newest' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_trending_products',
    sectionType: 'trending_products',
    title: 'Trending Products',
    subtitle: 'High-demand picks right now',
    enabled: true,
    displayOrder: 9,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View Trending', ctaUrl: '/shop?sort=trending' },
    sourceReferences: { productSourceMode: 'trending', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_testimonials',
    sectionType: 'testimonials',
    title: 'What Our Clients Say',
    subtitle: 'Verified customer reviews across Bangladesh',
    enabled: true,
    displayOrder: 10,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 3, tabletCols: 2, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 3, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
];

const HomepageLayoutSectionSchema = new Schema<IHomepageLayoutSection>(
  {
    sectionId: { type: String, required: true, trim: true, maxlength: 80 },
    sectionType: {
      type: String,
      enum: [
        'hero_slider',
        'promo_bento',
        'dynamic_banner',
        'featured_categories',
        'featured_products',
        'best_sellers',
        'latest_products',
        'new_arrivals',
        'trending_products',
        'product_collection',
        'brand_showcase',
        'feature_banners',
        'promotional_ad',
        'custom_content',
        'testimonials',
        'newsletter',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    subtitle: { type: String, default: '', trim: true, maxlength: 300 },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    widthMode: {
      type: String,
      enum: ['full', 'half', 'one_third', 'two_thirds', 'custom'],
      default: 'full',
    },
    customWidthPercent: { type: Number, default: 100, min: 10, max: 100 },
    layoutSettings: {
      desktopCols: { type: Number, default: 4, min: 1, max: 12 },
      tabletCols: { type: Number, default: 2, min: 1, max: 8 },
      mobileCols: { type: Number, default: 1, min: 1, max: 4 },
      paddingY: { type: Number, default: 12, min: 0, max: 120 },
      backgroundColor: { type: String, default: '' },
      backgroundGradient: { type: String, default: '' },
      contentAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    },
    contentSettings: {
      badgeText: { type: String, default: '' },
      bodyText: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
      ctaLabel: { type: String, default: '' },
      ctaUrl: { type: String, default: '' },
    },
    sourceReferences: {
      productSourceMode: {
        type: String,
        enum: ['bestsellers', 'latest', 'featured', 'new_arrivals', 'trending', 'category', 'brand', 'manual'],
        default: 'featured',
      },
      productIds: { type: [String], default: [] },
      categorySlug: { type: String, default: '' },
      brandSlug: { type: String, default: '' },
      productCount: { type: Number, default: 8, min: 1, max: 24 },
      sortBy: {
        type: String,
        enum: ['popular', 'newest', 'price_asc', 'price_desc', 'rating'],
        default: 'popular',
      },
      bannerPlacement: { type: String, default: 'hero_bento' },
      bannerIds: { type: [String], default: [] },
    },
    visibilitySettings: {
      desktop: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
      startsAt: { type: String, default: null },
      endsAt: { type: String, default: null },
    },
  },
  { _id: false },
);

const HomepageLayoutSchema = new Schema<IHomepageLayout>(
  {
    key: { type: String, required: true, unique: true, default: 'main', index: true },
    name: { type: String, default: 'Main Storefront Homepage', trim: true, maxlength: 140 },
    pageType: { type: String, default: 'homepage', trim: true },
    layoutVersion: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    publishedAt: { type: Date, default: null },
    draftSections: { type: [HomepageLayoutSectionSchema], default: () => DEFAULT_SERVER_HOMEPAGE_SECTIONS },
    publishedSections: { type: [HomepageLayoutSectionSchema], default: () => DEFAULT_SERVER_HOMEPAGE_SECTIONS },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const HomepageLayoutModel =
  mongoose.models.HomepageLayout || mongoose.model<IHomepageLayout>('HomepageLayout', HomepageLayoutSchema);
