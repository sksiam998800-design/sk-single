import { z } from 'zod';
import { BANNER_PLACEMENTS_ENUM } from '../banners/banner.validation';

const safeUrlOptional = z
  .string()
  .trim()
  .max(400)
  .refine(
    (url) => url === '' || url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://'),
    'URL must start with /, https://, or http://',
  )
  .optional()
  .default('');

export const HOMEPAGE_SECTION_TYPES = [
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
] as const;

export const homepageLayoutSectionSchema = z.object({
  sectionId: z.string().trim().min(2).max(80),
  sectionType: z.enum(HOMEPAGE_SECTION_TYPES),
  title: z.string().trim().min(1).max(140),
  subtitle: z.string().trim().max(300).optional().default(''),
  enabled: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(500).default(0),
  widthMode: z.enum(['full', 'half', 'one_third', 'two_thirds', 'custom']).default('full'),
  customWidthPercent: z.number().min(10).max(100).default(100),
  layoutSettings: z
    .object({
      desktopCols: z.number().int().min(1).max(12).default(8),
      tabletCols: z.number().int().min(1).max(8).default(4),
      mobileCols: z.number().int().min(1).max(4).default(2),
      paddingY: z.number().min(0).max(120).default(8),
      backgroundColor: z.string().trim().max(40).default(''),
      backgroundGradient: z.string().trim().max(260).default(''),
      contentAlign: z.enum(['left', 'center', 'right']).default('left'),
    })
    .default({
      desktopCols: 8,
      tabletCols: 4,
      mobileCols: 2,
      paddingY: 8,
      backgroundColor: '',
      backgroundGradient: '',
      contentAlign: 'left',
    }),
  contentSettings: z
    .object({
      badgeText: z.string().trim().max(80).optional().default(''),
      bodyText: z.string().trim().max(600).optional().default(''),
      imageUrl: safeUrlOptional,
      ctaLabel: z.string().trim().max(60).optional().default(''),
      ctaUrl: safeUrlOptional,
    })
    .default({
      badgeText: '',
      bodyText: '',
      imageUrl: '',
      ctaLabel: '',
      ctaUrl: '',
    }),
  sourceReferences: z
    .object({
      productSourceMode: z
        .enum(['bestsellers', 'latest', 'featured', 'new_arrivals', 'trending', 'category', 'brand', 'manual'])
        .default('featured'),
      productIds: z.array(z.string().trim().min(1)).max(32).default([]),
      categorySlug: z.string().trim().max(120).optional().default(''),
      brandSlug: z.string().trim().max(120).optional().default(''),
      productCount: z.number().int().min(1).max(24).default(8),
      sortBy: z.enum(['popular', 'newest', 'price_asc', 'price_desc', 'rating']).default('popular'),
      bannerPlacement: BANNER_PLACEMENTS_ENUM.optional().default('hero_bento'),
      bannerIds: z.array(z.string().trim().min(1)).max(24).optional().default([]),
    })
    .default({
      productSourceMode: 'featured',
      productIds: [],
      categorySlug: '',
      brandSlug: '',
      productCount: 8,
      sortBy: 'popular',
      bannerPlacement: 'hero_bento',
      bannerIds: [],
    }),
  visibilitySettings: z
    .object({
      desktop: z.boolean().default(true),
      tablet: z.boolean().default(true),
      mobile: z.boolean().default(true),
      startsAt: z.string().nullable().optional().default(null),
      endsAt: z.string().nullable().optional().default(null),
    })
    .default({ desktop: true, tablet: true, mobile: true, startsAt: null, endsAt: null }),
});

export const homepageLayoutUpdateSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  sections: z.array(homepageLayoutSectionSchema).min(1).max(40),
});

export const homepageSectionReorderSchema = z.object({
  order: z
    .array(
      z.object({
        sectionId: z.string().trim().min(1),
        displayOrder: z.number().int().min(0).max(500),
      }),
    )
    .min(1)
    .max(50),
});

export type HomepageLayoutUpdateInput = z.infer<typeof homepageLayoutUpdateSchema>;
export type HomepageLayoutSectionInput = z.infer<typeof homepageLayoutSectionSchema>;
export type HomepageSectionReorderInput = z.infer<typeof homepageSectionReorderSchema>;
