import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { HomepageConfigModel, PromotionalAdModel, CmsPageModel, FaqModel, BlogPostModel } from '../cms/cms.model';
import {
  DEFAULT_SERVER_HOMEPAGE_SECTIONS,
  HomepageLayoutModel,
  type IHomepageLayoutSection,
} from '../cms/homepageLayout.model';
import { HeroSlideModel } from '../hero-slides/heroSlide.model';
import { BannerModel } from '../banners/banner.model';
import { CategoryModel, BrandModel } from '../categories/category.model';
import { ProductModel } from '../products/product.model';
import { CouponModel, DiscountRuleModel, PromotionalCampaignModel } from '../coupons/coupon.model';
import { ReviewModel } from '../reviews/review.model';
import { NewsletterSubscriptionModel, SiteVisitModel, SupportEnquiryModel } from '../support/support.model';
import { isDatabaseReady, requireDatabase } from '../../database/connection';
import { AppError } from '../../middleware/error.middleware';
import { enrichProductPricing } from '../products/productCatalogHelpers';
import { getPublicStorefrontMegaMenus } from '../navigation/navigation.service';
import { env } from '../../config/env';
import {
  BD_DIVISIONS,
  getAreasForUpazila,
  getDistrictsForDivision,
  getDivisionNames,
  getUpazilasForDistrict,
} from '../../../../src/lib/bdLocations';

const router = Router();
export const homepagePublicRoutes = Router();

function formatProductCard(p: Record<string, unknown>) {
  const enriched = enrichProductPricing(p) as Record<string, unknown>;
  return {
    id: enriched.id,
    name: enriched.name,
    slug: enriched.slug,
    sku: enriched.sku,
    brandName: enriched.brandName || '',
    categoryId: enriched.categoryId,
    subCategoryId: enriched.subCategoryId ?? null,
    attributeGroup: enriched.attributeGroup || 'general',
    images: enriched.images || [],
    currentPrice: enriched.currentPrice,
    originalPrice: enriched.originalPrice,
    discountPercent: enriched.discountPercent,
    isFlashSaleActive: enriched.isFlashSaleActive,
    availableStock: enriched.availableStock,
    hasVariants: Boolean(enriched.hasVariants) && Array.isArray(enriched.variants) && enriched.variants.length > 0,
    variants: enriched.variants || [],
    ratingAverage: Number(enriched.ratingAverage || 0),
    reviewCount: Number(enriched.reviewCount || 0),
    soldCount: Number(enriched.soldCount || 0),
    isFeatured: Boolean(enriched.isFeatured),
    isNewArrival: Boolean(enriched.isNewArrival),
    isBestSeller: Boolean(enriched.isBestSeller),
    isPremiumCollection: Boolean(enriched.isPremiumCollection),
  };
}

function buildActiveBannerFilter(now: Date) {
  return {
    $and: [
      {
        $or: [
          { status: 'published' },
          { status: 'scheduled', isPublished: { $ne: false } },
          { status: { $exists: false }, isPublished: true },
        ],
      },
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
}

async function resolveLayoutSectionProducts(sections: IHomepageLayoutSection[]) {
  const sectionProducts: Record<string, ReturnType<typeof formatProductCard>[]> = {};
  const customProductIds = Array.from(
    new Set(
      sections
        .filter((s) => s.sourceReferences?.productSourceMode === 'manual')
        .flatMap((s) => s.sourceReferences?.productIds || []),
    ),
  );
  const manualDocs =
    customProductIds.length > 0
      ? await ProductModel.find({ _id: { $in: customProductIds }, status: 'published' })
          .populate('categoryId', 'name slug')
          .lean()
      : [];
  const manualMap = new Map(
    manualDocs.map((p) => [String(p._id), formatProductCard(p as unknown as Record<string, unknown>)]),
  );

  const dynamicSections = sections.filter(
    (s) =>
      s.enabled !== false &&
      (s.sectionType === 'product_collection' ||
        s.sectionType === 'featured_products' ||
        s.sectionType === 'best_sellers' ||
        s.sectionType === 'latest_products' ||
        s.sectionType === 'new_arrivals' ||
        s.sectionType === 'trending_products') &&
      s.sourceReferences &&
      (s.sourceReferences.productSourceMode === 'category' ||
        s.sourceReferences.productSourceMode === 'brand' ||
        s.sourceReferences.productSourceMode === 'manual'),
  );

  for (const sec of dynamicSections) {
    const mode = sec.sourceReferences.productSourceMode;
    const limit = Math.min(24, Math.max(1, Number(sec.sourceReferences.productCount || 8)));
    if (mode === 'manual') {
      sectionProducts[sec.sectionId] = (sec.sourceReferences.productIds || [])
        .map((id) => manualMap.get(String(id)))
        .filter((item): item is ReturnType<typeof formatProductCard> => Boolean(item))
        .slice(0, limit);
      continue;
    }

    const filter: Record<string, unknown> = { status: 'published' };
    if (mode === 'category' && sec.sourceReferences.categorySlug) {
      const cat = await CategoryModel.findOne({ slug: sec.sourceReferences.categorySlug, isActive: true }).select('_id').lean();
      if (cat) {
        filter.$or = [{ categoryId: cat._id }, { subCategoryId: cat._id }];
      }
    } else if (mode === 'brand' && sec.sourceReferences.brandSlug) {
      const brand = await BrandModel.findOne({ slug: sec.sourceReferences.brandSlug, isActive: true }).select('_id name').lean();
      if (brand) {
        filter.$or = [{ brandId: brand._id }, { brandName: brand.name }];
      }
    }

    const sortSpec: Record<string, 1 | -1> =
      sec.sourceReferences.sortBy === 'newest'
        ? { createdAt: -1 }
        : sec.sourceReferences.sortBy === 'price_asc'
          ? { salePrice: 1, basePrice: 1 }
          : sec.sourceReferences.sortBy === 'price_desc'
            ? { salePrice: -1, basePrice: -1 }
            : sec.sourceReferences.sortBy === 'rating'
              ? { ratingAverage: -1, reviewCount: -1 }
              : { soldCount: -1, createdAt: -1 };

    const docs = await ProductModel.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sortSpec)
      .limit(limit)
      .lean();
    sectionProducts[sec.sectionId] = docs.map((p) => formatProductCard(p as unknown as Record<string, unknown>));
  }

  return sectionProducts;
}

// Track storefront visitor session (for real Visitors 30d KPI)
router.post('/analytics/visit', async (req: Request, res: Response) => {
  if (!isDatabaseReady()) {
    res.json({ ok: true, recorded: false });
    return;
  }
  try {
    const schema = z.object({
      sessionKey: z.string().trim().min(4).max(120),
      path: z.string().trim().max(200).default('/'),
      referrer: z.string().max(300).optional(),
    });
    const parsed = schema.parse(req.body);
    await SiteVisitModel.create({
      sessionKey: parsed.sessionKey,
      path: parsed.path,
      referrer: parsed.referrer,
      userAgent: req.get('user-agent')?.slice(0, 200),
    });
    res.status(201).json({ ok: true, recorded: true });
  } catch {
    res.json({ ok: true, recorded: false });
  }
});

// Track promotional ad impression / click
router.post('/ads/:id/track', requireDatabase, async (req: Request, res: Response) => {
  try {
    const { event } = z.object({ event: z.enum(['impression', 'click']) }).parse(req.body);
    const incField = event === 'click' ? { clicks: 1 } : { impressions: 1 };
    await PromotionalAdModel.updateOne({ _id: req.params.id }, { $inc: incField });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// Public /api/homepage/layout endpoint
homepagePublicRoutes.get('/layout', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const layoutDoc = await HomepageLayoutModel.findOne({ key: 'main' }).lean();
    const publishedSections =
      (layoutDoc?.publishedSections as IHomepageLayoutSection[] | undefined)?.length
        ? (layoutDoc!.publishedSections as IHomepageLayoutSection[])
        : DEFAULT_SERVER_HOMEPAGE_SECTIONS;

    const sortedSections = publishedSections
      .slice()
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));

    const sectionProducts = await resolveLayoutSectionProducts(sortedSections);

    res.json({
      ok: true,
      layout: {
        name: layoutDoc?.name || 'Main Storefront Homepage',
        layoutVersion: layoutDoc?.layoutVersion || 1,
        publishedAt: layoutDoc?.publishedAt || null,
        sections: sortedSections,
      },
      sectionProducts,
    });
  } catch (err) {
    next(err);
  }
});

// Public /api/homepage/banners endpoint
homepagePublicRoutes.get('/banners', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const filter: Record<string, unknown> = buildActiveBannerFilter(now);
    const placement = String(req.query.placement || '').trim();
    if (placement) filter.placement = placement;

    const banners = await BannerModel.find(filter).sort({ displayOrder: 1, priority: -1, updatedAt: -1 }).lean();
    const serialized = banners.map((b) => ({ ...b, id: String(b._id) }));
    const bannersByPlacement: Record<string, typeof serialized> = {};
    for (const b of serialized) {
      const key = String(b.placement || 'custom');
      if (!bannersByPlacement[key]) bannersByPlacement[key] = [];
      bannersByPlacement[key].push(b);
    }

    res.json({ ok: true, banners: serialized, bannersByPlacement });
  } catch (err) {
    next(err);
  }
});

// Homepage payload driven dynamically by MongoDB Atlas CMS + real catalog + HeroSlideModel + BannerModel + HomepageLayoutModel
router.get('/homepage', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const scheduleFilter = {
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };

    const [
      config,
      layoutDoc,
      heroSlideTotalCount,
      heroSlidesStandalone,
      bentoBannerTotalCount,
      bannersStandalone,
      categories,
      brands,
      featuredRaw,
      latestRaw,
      bestSellersRaw,
      trendingRaw,
      newArrivalsRaw,
      collectionRaw,
      approvedReviews,
      activeAds,
      activeCampaigns,
    ] = await Promise.all([
      HomepageConfigModel.findOne({ key: 'main' }).lean(),
      HomepageLayoutModel.findOne({ key: 'main' }).lean(),
      HeroSlideModel.countDocuments({ $or: [{ placement: 'home' }, { placement: { $exists: false } }] }),
      HeroSlideModel.find({
        isActive: true,
        $and: [
          { $or: [{ placement: 'home' }, { placement: { $exists: false } }] },
          ...scheduleFilter.$and,
        ],
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      BannerModel.countDocuments({ placement: 'hero_bento' }),
      BannerModel.find(buildActiveBannerFilter(now)).sort({ displayOrder: 1, priority: -1, updatedAt: -1 }).lean(),
      CategoryModel.find({ isActive: true, parentId: null }).sort({ sortOrder: 1, name: 1 }).lean(),
      BrandModel.find({ isActive: true }).sort({ name: 1 }).limit(16).lean(),
      ProductModel.find({ status: 'published', isFeatured: true })
        .populate('categoryId', 'name slug')
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ status: 'published' })
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ status: 'published' })
        .populate('categoryId', 'name slug')
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ status: 'published' })
        .populate('categoryId', 'name slug')
        .sort({ soldCount: -1, ratingAverage: -1, updatedAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ status: 'published', isNewArrival: true })
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ status: 'published', isPremiumCollection: true })
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ReviewModel.find({ status: 'approved', $or: [{ isFeatured: true }, { isVerifiedPurchase: true }] })
        .populate('productId', 'name slug')
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(6)
        .lean(),
      PromotionalAdModel.find({
        isEnabled: true,
        isPublished: true,
        ...scheduleFilter,
      })
        .sort({ priority: -1, updatedAt: -1 })
        .lean(),
      PromotionalCampaignModel.find({
        isActive: true,
        ...scheduleFilter,
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
    ]);

    const effectivePremium = collectionRaw.length > 0 ? collectionRaw : latestRaw;
    const effectiveFeatured = featuredRaw.length > 0 ? featuredRaw : bestSellersRaw;
    const effectiveNewArrivals = newArrivalsRaw.length > 0 ? newArrivalsRaw : latestRaw;
    const activeAd = activeAds.find((a) => a.placement === 'homepage_mid') || activeAds[0] || null;

    // Prefer dedicated HeroSlideModel / BannerModel collections whenever managed there (even if all currently disabled)
    const mappedHeroSlides =
      heroSlideTotalCount > 0
        ? heroSlidesStandalone.map((s) => ({
            id: String(s._id),
            badgeText: s.badgeText,
            headlineLine1: s.heading,
            headlineLine2: s.headlineLine2 || '',
            subtitle: s.subtitle,
            ctaLabel: s.ctaText,
            ctaUrl: s.ctaUrl,
            imageUrl: s.desktopImageUrl,
            mobileImageUrl: s.mobileImageUrl || s.desktopImageUrl,
            isActive: s.isActive,
          }))
        : config?.heroSlides || [];

    const serializedBanners = bannersStandalone.map((b) => ({ ...b, id: String(b._id) }));
    const bannersByPlacement: Record<string, typeof serializedBanners> = {};
    for (const b of serializedBanners) {
      const key = String(b.placement || 'custom');
      if (!bannersByPlacement[key]) bannersByPlacement[key] = [];
      bannersByPlacement[key].push(b);
    }

    const bentoBanners = serializedBanners.filter((b) => b.placement === 'hero_bento');
    const mappedPromoBentoCards =
      bentoBannerTotalCount > 0
        ? bentoBanners.map((b) => ({
            id: b.id,
            eyebrow: b.eyebrow || '',
            title: b.title,
            subtitle: b.subtitle || '',
            ctaLabel: b.ctaText,
            ctaUrl: b.destinationUrl,
            imageUrl: b.desktopImageUrl,
            mobileImageUrl: b.mobileImageUrl || b.desktopImageUrl,
            theme: b.theme,
          }))
        : config?.promoBentoCards || [];

    // Populate custom curated homepageSections configured in Admin > Homepage Sections
    const rawSections = Array.isArray(config?.homepageSections)
      ? config.homepageSections.filter((s: { enabled?: boolean }) => s.enabled !== false)
      : [];
    const customProductIds = Array.from(
      new Set(
        rawSections.flatMap((s: { productIds?: unknown[] }) =>
          Array.isArray(s.productIds) ? s.productIds.map(String) : [],
        ),
      ),
    );
    const customProducts =
      customProductIds.length > 0
        ? await ProductModel.find({ _id: { $in: customProductIds }, status: 'published' })
            .populate('categoryId', 'name slug')
            .lean()
        : [];
    const customProdMap = new Map(
      customProducts.map((p) => [String(p._id), formatProductCard(p as unknown as Record<string, unknown>)]),
    );
    const resolvedHomepageSections = rawSections
      .sort((a: { sortOrder?: number }, b: { sortOrder?: number }) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((s: { key: string; title: string; subtitle?: string; sortOrder?: number; productIds?: unknown[] }) => ({
        key: s.key,
        title: s.title,
        subtitle: s.subtitle || '',
        sortOrder: Number(s.sortOrder || 0),
        products: (s.productIds || [])
          .map((pid) => customProdMap.get(String(pid)))
          .filter((item): item is ReturnType<typeof formatProductCard> => Boolean(item)),
      }))
      .filter((s: { products: unknown[] }) => s.products.length > 0);

    // Resolve published layout sections (with fallback to default layout synced with enabledSections)
    const rawPublishedLayout =
      (layoutDoc?.publishedSections as IHomepageLayoutSection[] | undefined)?.length
        ? (layoutDoc!.publishedSections as IHomepageLayoutSection[])
        : DEFAULT_SERVER_HOMEPAGE_SECTIONS;
    const publishedSections = rawPublishedLayout
      .slice()
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
    const sectionProducts = await resolveLayoutSectionProducts(publishedSections);

    const mergedConfig = config
      ? {
          ...config,
          heroSlides: mappedHeroSlides,
          promoBentoCards: mappedPromoBentoCards,
        }
      : null;

    res.json({
      ok: true,
      config: mergedConfig,
      publishedLayout: {
        name: layoutDoc?.name || 'Main Storefront Homepage',
        layoutVersion: layoutDoc?.layoutVersion || 1,
        publishedAt: layoutDoc?.publishedAt || null,
        sections: publishedSections,
      },
      sectionProducts,
      heroSlides: mappedHeroSlides,
      banners: serializedBanners,
      bannersByPlacement,
      categories: categories.map((c) => ({ ...c, id: String(c._id), parentId: c.parentId ? String(c.parentId) : null })),
      brands: brands.map((b) => ({ ...b, id: String(b._id) })),
      featuredProducts: effectiveFeatured.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      latestProducts: latestRaw.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      bestSellers: bestSellersRaw.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      trendingProducts: trendingRaw.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      newArrivals: effectiveNewArrivals.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      premiumCollection: effectivePremium.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
      homepageSections: resolvedHomepageSections,
      testimonials: approvedReviews.map((r) => ({
        id: String(r._id),
        userName: r.userName,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: r.isVerifiedPurchase,
        isFeatured: Boolean(r.isFeatured),
        createdAt: r.createdAt,
        product: r.productId,
      })),
      promotionalAd: activeAd ? { ...activeAd, id: String(activeAd._id) } : null,
      promotionalAds: activeAds.map((a) => ({ ...a, id: String(a._id) })),
      campaigns: activeCampaigns.map((c) => ({ ...c, id: String(c._id) })),
    });
  } catch (err) {
    next(err);
  }
});

// Header navigation & global storefront metadata
router.get('/navigation', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const scheduleFilter = {
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };

    const [categories, brands, config, banners, promotionalAds, megaMenus] = await Promise.all([
      CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      BrandModel.find({ isActive: true }).sort({ name: 1 }).lean(),
      HomepageConfigModel.findOne({ key: 'main' })
        .select(
          'storeInfo currencySettings announcementBar headerSettings footerSettings navigationMenu contactInfo shippingSettings deliveryZones deliveryOptions taxSettings paymentMethods seoDefaults maintenanceMode securitySettings promotionalPopups enabledSections productTrustHighlights cartHeroSettings checkoutHeroSettings wishlistHeroSettings',
        )
        .lean(),
      BannerModel.find(buildActiveBannerFilter(now)).sort({ displayOrder: 1, priority: -1, updatedAt: -1 }).lean(),
      PromotionalAdModel.find({ isEnabled: true, isPublished: true, ...scheduleFilter })
        .sort({ priority: -1, updatedAt: -1 })
        .lean(),
      getPublicStorefrontMegaMenus(),
    ]);
    res.json({
      ok: true,
      categories: categories.map((c) => ({ ...c, id: String(c._id), parentId: c.parentId ? String(c.parentId) : null })),
      brands: brands.map((b) => ({ ...b, id: String(b._id) })),
      settings: config || null,
      megaMenus,
      banners: banners.map((b) => ({ ...b, id: String(b._id) })),
      promotionalAds: promotionalAds.map((a) => ({ ...a, id: String(a._id) })),
    });
  } catch (err) {
    next(err);
  }
});

// Dedicated public dynamic mega menu endpoint
router.get('/navigation/menus', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const menus = await getPublicStorefrontMegaMenus();
    res.json({ ok: true, menus });
  } catch (err) {
    next(err);
  }
});

// Public Cart Page Dynamic Hero Slider & Cart Experience Settings
router.get('/cart-hero', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [totalManagedSlides, activeSlides, config] = await Promise.all([
      HeroSlideModel.countDocuments({ placement: 'cart' }),
      HeroSlideModel.find({
        placement: 'cart',
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      HomepageConfigModel.findOne({ key: 'main' }).select('cartHeroSettings').lean(),
    ]);

    res.json({
      ok: true,
      totalManagedSlides,
      slides: activeSlides.map((s) => ({
        ...s,
        placement: 'cart' as const,
        id: String(s._id),
      })),
      settings: config?.cartHeroSettings || null,
    });
  } catch (err) {
    next(err);
  }
});

// Public Checkout Page Dynamic Hero Slider & Settings
router.get('/checkout-hero', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [totalManagedSlides, activeSlides, config] = await Promise.all([
      HeroSlideModel.countDocuments({ placement: 'checkout' }),
      HeroSlideModel.find({
        placement: 'checkout',
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      HomepageConfigModel.findOne({ key: 'main' }).select('checkoutHeroSettings').lean(),
    ]);

    res.json({
      ok: true,
      totalManagedSlides,
      slides: activeSlides.map((s) => ({
        ...s,
        placement: 'checkout' as const,
        id: String(s._id),
      })),
      settings: config?.checkoutHeroSettings || null,
    });
  } catch (err) {
    next(err);
  }
});

// Public Wishlist Page Dynamic Hero Slider, Settings & Optional Bottom Promo Banner
router.get('/wishlist-hero', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [totalManagedSlides, activeSlides, config, bottomBanner] = await Promise.all([
      HeroSlideModel.countDocuments({ placement: 'wishlist' }),
      HeroSlideModel.find({
        placement: 'wishlist',
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      HomepageConfigModel.findOne({ key: 'main' }).select('wishlistHeroSettings').lean(),
      BannerModel.findOne({
        placement: 'wishlist_bottom',
        ...buildActiveBannerFilter(now),
      })
        .sort({ displayOrder: 1, priority: -1, updatedAt: -1 })
        .lean(),
    ]);

    res.json({
      ok: true,
      totalManagedSlides,
      slides: activeSlides.map((s) => ({
        ...s,
        placement: 'wishlist' as const,
        id: String(s._id),
      })),
      settings: config?.wishlistHeroSettings || null,
      bottomBanner: bottomBanner ? { ...bottomBanner, id: String(bottomBanner._id) } : null,
    });
  } catch (err) {
    next(err);
  }
});

// Bangladesh Cascading Location Directory (8 Divisions -> 64 Districts -> Thanas -> Unions/Areas)
router.get('/locations/bd', (req: Request, res: Response) => {
  const division = String(req.query.division || '').trim();
  const district = String(req.query.district || '').trim();
  const upazila = String(req.query.upazila || '').trim();
  const full = String(req.query.full || '') === 'true';

  if (full) {
    res.json({ ok: true, divisions: BD_DIVISIONS });
    return;
  }
  if (division && district && upazila) {
    res.json({ ok: true, areas: getAreasForUpazila(division, district, upazila) });
    return;
  }
  if (division && district) {
    res.json({
      ok: true,
      upazilas: getUpazilasForDistrict(division, district).map((u) => ({ name: u.name, areaCount: u.areas.length })),
    });
    return;
  }
  if (division) {
    res.json({
      ok: true,
      districts: getDistrictsForDivision(division).map((d) => ({
        name: d.name,
        isDhakaMetro: Boolean(d.isDhakaMetro),
        upazilaCount: d.upazilas.length,
      })),
    });
    return;
  }

  res.json({
    ok: true,
    divisions: getDivisionNames().map((name) => ({
      name,
      districtCount: getDistrictsForDivision(name).length,
    })),
  });
});

router.get('/locations/bd/divisions', (_req: Request, res: Response) => {
  res.json({ ok: true, divisions: getDivisionNames() });
});

router.get('/locations/bd/districts', (req: Request, res: Response) => {
  const division = String(req.query.division || '').trim();
  res.json({ ok: true, districts: getDistrictsForDivision(division).map((d) => d.name) });
});

router.get('/locations/bd/upazilas', (req: Request, res: Response) => {
  const division = String(req.query.division || '').trim();
  const district = String(req.query.district || '').trim();
  res.json({ ok: true, upazilas: getUpazilasForDistrict(division, district).map((u) => u.name) });
});

router.get('/locations/bd/areas', (req: Request, res: Response) => {
  const division = String(req.query.division || '').trim();
  const district = String(req.query.district || '').trim();
  const upazila = String(req.query.upazila || '').trim();
  res.json({ ok: true, areas: getAreasForUpazila(division, district, upazila) });
});

// Public FAQs
router.get('/faqs', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faqs = await FaqModel.find({ isPublished: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ ok: true, faqs: faqs.map((f) => ({ ...f, id: String(f._id) })) });
  } catch (err) {
    next(err);
  }
});

// Public Blog listing & detail
router.get('/blogs', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await BlogPostModel.find({ isPublished: true }).sort({ publishedAt: -1, createdAt: -1 }).lean();
    res.json({ ok: true, posts: posts.map((p) => ({ ...p, id: String(p._id) })) });
  } catch (err) {
    next(err);
  }
});

router.get('/blogs/:slug', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await BlogPostModel.findOne({ slug: String(req.params.slug).toLowerCase(), isPublished: true }).lean();
    if (!post) throw new AppError(404, 'BLOG_NOT_FOUND', 'Blog article not found.');
    res.json({ ok: true, post: { ...post, id: String(post._id) } });
  } catch (err) {
    next(err);
  }
});

// Public Special Offers, Flash Sales & Coupons
router.get('/offers', requireDatabase, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [campaigns, coupons, rules, discountedProducts] = await Promise.all([
      PromotionalCampaignModel.find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ createdAt: -1 })
        .lean(),
      CouponModel.find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .select('code description discountType discountValue maxDiscountAmount minOrderAmount endsAt')
        .sort({ createdAt: -1 })
        .lean(),
      DiscountRuleModel.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
      ProductModel.find({
        status: 'published',
        $or: [{ salePrice: { $gt: 0 } }, { flashSalePrice: { $gt: 0 } }],
      })
        .sort({ soldCount: -1 })
        .limit(12)
        .lean(),
    ]);

    res.json({
      ok: true,
      campaigns: campaigns.map((c) => ({ ...c, id: String(c._id) })),
      coupons: coupons.map((c) => ({ ...c, id: String(c._id) })),
      rules: rules.map((r) => ({ ...r, id: String(r._id) })),
      products: discountedProducts.map((p) => formatProductCard(p as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
});

// CMS static info & policy pages
router.get('/pages/:slug', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = await CmsPageModel.findOne({ slug: String(req.params.slug).toLowerCase(), isPublished: true }).lean();
    if (!page) throw new AppError(404, 'PAGE_NOT_FOUND', 'Requested page not found.');
    res.json({ ok: true, page });
  } catch (err) {
    next(err);
  }
});

// Newsletter subscription
router.post('/newsletter/subscribe', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
      source: z.string().max(60).optional(),
    });
    const parsed = schema.parse(req.body);

    const existing = await NewsletterSubscriptionModel.findOne({ email: parsed.email });
    if (existing && existing.status === 'subscribed') {
      res.json({ ok: true, alreadySubscribed: true, message: 'This email is already subscribed to NOVARA updates.' });
      return;
    }

    if (existing) {
      existing.status = 'subscribed';
      existing.consentRecordedAt = new Date();
      existing.unsubscribedAt = null;
      await existing.save();
    } else {
      await NewsletterSubscriptionModel.create({
        email: parsed.email,
        status: 'subscribed',
        consentRecordedAt: new Date(),
        source: parsed.source || 'homepage_newsletter',
      });
    }

    res.status(201).json({ ok: true, message: 'Thank you for subscribing to NOVARA COMMERCE updates!' });
  } catch (err) {
    next(err);
  }
});

router.post('/newsletter/unsubscribe', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().trim().email().toLowerCase() }).parse(req.body);
    await NewsletterSubscriptionModel.updateOne(
      { email },
      { $set: { status: 'unsubscribed', unsubscribedAt: new Date() } },
    );
    res.json({ ok: true, message: 'You have been unsubscribed from marketing updates.' });
  } catch (err) {
    next(err);
  }
});

// Customer support enquiry submission
router.post('/support/enquiry', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().toLowerCase(),
      phone: z.string().trim().max(24).optional(),
      subject: z.string().trim().min(3).max(140),
      orderNumber: z.string().trim().max(40).optional(),
      message: z.string().trim().min(10).max(2000),
      websiteHoneyPot: z.string().max(0).optional(),
    });
    const parsed = schema.parse(req.body);
    if (parsed.websiteHoneyPot) {
      throw new AppError(400, 'SPAM_DETECTED', 'Invalid submission.');
    }

    const enquiry = await SupportEnquiryModel.create({
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      subject: parsed.subject,
      orderNumber: parsed.orderNumber,
      message: parsed.message,
    });

    res.status(201).json({
      ok: true,
      ticketId: String(enquiry._id),
      message: 'Your support enquiry has been received. Our team will respond shortly.',
    });
  } catch (err) {
    next(err);
  }
});

// Dynamic XML Sitemap
export async function sitemapHandler(_req: Request, res: Response): Promise<void> {
  const baseUrl = env.APP_URL.replace(/\/$/, '');
  let urls = ['', '/shop', '/offers', '/blog', '/faqs', '/about', '/track-order', '/contact', '/pages/about-us', '/pages/shipping-info', '/pages/return-policy', '/pages/faqs'];

  if (isDatabaseReady()) {
    try {
      const [categories, products, posts] = await Promise.all([
        CategoryModel.find({ isActive: true }).select('slug updatedAt').lean(),
        ProductModel.find({ status: 'published' }).select('slug updatedAt').lean(),
        BlogPostModel.find({ isPublished: true }).select('slug updatedAt').lean(),
      ]);
      urls = [
        ...urls,
        ...categories.map((c) => `/category/${c.slug}`),
        ...products.map((p) => `/product/${p.slug}`),
        ...posts.map((p) => `/blog/${p.slug}`),
      ];
    } catch {
      // Serve base static routes if DB query fails
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${baseUrl}${path}</loc></url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(xml);
}

router.get(['/sitemap.xml', '/seo/sitemap.xml'], sitemapHandler);

export default router;
