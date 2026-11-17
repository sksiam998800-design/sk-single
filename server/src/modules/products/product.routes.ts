import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ProductModel } from './product.model';
import { CategoryModel, BrandModel } from '../categories/category.model';
import { ProductAttributePresetModel } from '../cms/cms.model';
import { ReviewModel } from '../reviews/review.model';
import { OrderModel } from '../orders/order.model';
import { SearchAnalyticsModel } from '../support/support.model';
import { requireDatabase } from '../../database/connection';
import { authenticateOptional, authenticateRequired, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { resolveEffectiveUnitPrice } from '../../../../src/lib/pricingEngine';
import {
  buildGroupedSpecifications,
  mergeLiveAttributeDefinitions,
  normalizeAttributeOptions,
  type ProductAttributeValueEntry,
} from '../../../../src/lib/productAttributes';
import { productQuestionSchema } from './product.validation';
import {
  buildEffectivePriceMongoExpr,
  buildProductCatalogFilter,
  buildSearchFilter,
  collectDescendantCategoryIds,
  enrichProductPricing,
  getCatalogSortSpec,
} from './productCatalogHelpers';

const router = Router();

// Bounded autocomplete suggestions (max 8)
router.get('/search/suggestions', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    const rawLimit = Number(req.query.limit || 8);
    const limit = Math.min(8, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 8));

    if (q.length < 1) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    const searchFilter = buildSearchFilter(q);
    const items = await ProductModel.find({ status: 'published', ...searchFilter })
      .select('name nameBn slug sku basePrice salePrice flashSalePrice flashSaleStartsAt flashSaleEndsAt images brandName')
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const suggestions = items.map((item) => {
      const pricing = resolveEffectiveUnitPrice({
        basePrice: item.basePrice,
        salePrice: item.salePrice,
        flashSalePrice: item.flashSalePrice,
        flashSaleStartsAt: item.flashSaleStartsAt,
        flashSaleEndsAt: item.flashSaleEndsAt,
      });
      return {
        id: String(item._id),
        name: item.name,
        slug: item.slug,
        brandName: item.brandName || '',
        imageUrl: item.images?.[0]?.url || '',
        currentPrice: pricing.currentPrice,
        originalPrice: pricing.originalPrice,
        discountPercent: pricing.discountPercent,
      };
    });

    res.json({ ok: true, suggestions });
  } catch (err) {
    next(err);
  }
});

// Category-aware dynamic attribute filters for Shop & Category pages (registered BEFORE /:slug!)
router.get('/attributes/filters', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categorySlug = String(req.query.category || '').trim().toLowerCase();
    const subCategorySlug = String(req.query.subCategory || '').trim().toLowerCase();

    const allCategories = await CategoryModel.find({ isActive: true }).lean();
    const relevantCategoryIds: string[] = [];
    let descendantObjectIds: unknown[] = [];

    if (categorySlug && categorySlug !== 'all') {
      const matched = allCategories.find((c) => c.slug === categorySlug);
      if (matched) {
        relevantCategoryIds.push(String(matched._id));
        descendantObjectIds = collectDescendantCategoryIds(matched._id, allCategories);
      }
    }
    if (subCategorySlug && subCategorySlug !== 'all') {
      const matchedSub = allCategories.find((c) => c.slug === subCategorySlug);
      if (matchedSub) {
        relevantCategoryIds.push(String(matchedSub._id));
        descendantObjectIds = collectDescendantCategoryIds(matchedSub._id, allCategories);
      }
    }

    const attrQuery: Record<string, unknown> = {
      isActive: true,
      isFilterable: true,
      isVisibleToCustomers: { $ne: false },
    };
    if (relevantCategoryIds.length > 0) {
      attrQuery.$or = [
        { scope: 'global' },
        { scope: 'category', categoryIds: { $in: relevantCategoryIds } },
      ];
    } else {
      attrQuery.scope = { $in: ['global', 'category'] };
    }

    const productScopeFilter: Record<string, unknown> = { status: 'published' };
    if (descendantObjectIds.length > 0) {
      productScopeFilter.$or = [
        { categoryId: { $in: descendantObjectIds } },
        { subCategoryId: { $in: descendantObjectIds } },
      ];
    }

    const [filterDefs, matchingProducts] = await Promise.all([
      ProductAttributePresetModel.find(attrQuery).sort({ sortOrder: 1, name: 1 }).lean(),
      ProductModel.find(productScopeFilter)
        .select('attributeValues attributes variants.options variants.isActive')
        .lean(),
    ]);

    const filters = filterDefs
      .map((def) => {
        const code = String(def.code || '').toLowerCase();
        const definedOptions = normalizeAttributeOptions(
          Array.isArray(def.options) ? (def.options as Array<Record<string, unknown>>) : [],
          Array.isArray(def.values) ? (def.values as string[]) : [],
        );
        const valueCounts = new Map<string, number>();

        for (const prod of matchingProducts) {
          const seenForProd = new Set<string>();
          if (Array.isArray(prod.attributeValues)) {
            for (const entry of prod.attributeValues as Array<{ code?: string; value?: unknown }>) {
              if (String(entry.code || '').toLowerCase() !== code) continue;
              const vals = Array.isArray(entry.value)
                ? entry.value.map(String)
                : def.inputType === 'boolean'
                  ? [
                      entry.value === true || ['true', 'yes', '1'].includes(String(entry.value).trim().toLowerCase())
                        ? 'Yes'
                        : 'No',
                    ]
                  : typeof entry.value === 'boolean'
                    ? [entry.value ? 'Yes' : 'No']
                    : entry.value != null && String(entry.value).trim()
                      ? [String(entry.value).trim()]
                      : [];
              for (const v of vals) {
                if (!seenForProd.has(v.toLowerCase())) {
                  seenForProd.add(v.toLowerCase());
                  valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
                }
              }
            }
          }
          if (prod.attributes && typeof prod.attributes === 'object') {
            for (const [k, rawV] of Object.entries(prod.attributes as Record<string, unknown>)) {
              if (k.toLowerCase() === code || k.toLowerCase() === String(def.name || '').toLowerCase()) {
                const v = String(rawV || '').trim();
                if (v && !seenForProd.has(v.toLowerCase())) {
                  seenForProd.add(v.toLowerCase());
                  valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
                }
              }
            }
          }
          if (Array.isArray(prod.variants)) {
            for (const v of prod.variants as Array<{ isActive?: boolean; options?: Record<string, string> }>) {
              if (v.isActive === false || !v.options) continue;
              for (const [optKey, optVal] of Object.entries(v.options)) {
                if (optKey.toLowerCase() === code || optKey.toLowerCase() === String(def.name || '').toLowerCase()) {
                  const cleanVal = String(optVal || '').trim();
                  if (cleanVal && !seenForProd.has(cleanVal.toLowerCase())) {
                    seenForProd.add(cleanVal.toLowerCase());
                    valueCounts.set(cleanVal, (valueCounts.get(cleanVal) || 0) + 1);
                  }
                }
              }
            }
          }
        }

        const mergedOptions = definedOptions.length > 0
          ? definedOptions.map((o) => {
              const countMatch = Array.from(valueCounts.entries()).find(
                ([k]) => k.toLowerCase() === o.label.toLowerCase() || k.toLowerCase() === o.value.toLowerCase(),
              );
              return {
                label: o.label,
                value: o.value || o.label,
                colorHex: o.colorHex || '',
                count: countMatch ? countMatch[1] : 0,
              };
            })
          : def.inputType === 'boolean'
            ? [
                { label: 'Yes', value: 'true', colorHex: '', count: valueCounts.get('Yes') || 0 },
                { label: 'No', value: 'false', colorHex: '', count: valueCounts.get('No') || 0 },
              ]
            : Array.from(valueCounts.entries()).map(([label, count]) => ({
                label,
                value: label,
                colorHex: '',
                count,
              }));

        return {
          id: String(def._id),
          name: def.name,
          code: def.code,
          inputType: def.inputType || 'single_select',
          unit: def.unit || '',
          options: mergedOptions,
        };
      })
      .filter((f) => f.options.length > 0);

    res.json({ ok: true, filters });
  } catch (err) {
    next(err);
  }
});

// Product listing with server-side filters, pagination, and sorting
router.get('/', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(48, Math.max(1, Number(req.query.limit || 16)));
    const q = String(req.query.q || '').trim();
    const categorySlug = String(req.query.category || '').trim().toLowerCase();
    const subCategorySlug = String(req.query.subCategory || '').trim().toLowerCase();
    const brandSlug = String(req.query.brand || '').trim().toLowerCase();
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const inStockOnly = req.query.inStock === 'true';
    const discountOnly = req.query.discount === 'true';
    const minRating = req.query.minRating ? Number(req.query.minRating) : null;
    const section = String(req.query.section || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'popular');
    const rawIds = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[a-f0-9]{24}$/i.test(s))
      .slice(0, 48);

    const attributeFilters: Record<string, string[]> = {};
    for (const [paramKey, paramVal] of Object.entries(req.query)) {
      if (!paramKey.startsWith('attr_') || !paramVal) continue;
      const code = paramKey.slice(5).trim().toLowerCase();
      if (!code) continue;
      const values = Array.isArray(paramVal)
        ? paramVal.flatMap((v) => String(v).split(','))
        : String(paramVal).split(',');
      const cleaned = values.map((v) => v.trim()).filter(Boolean);
      if (cleaned.length > 0) {
        attributeFilters[code] = cleaned;
      }
    }

    const allCategories = await CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();

    let resolvedCategory: Record<string, unknown> | null = null;
    let categoryIds: unknown[] | undefined;
    let subcategories: Array<Record<string, unknown>> = [];

    if (categorySlug && categorySlug !== 'all') {
      const matched = allCategories.find((c) => c.slug === categorySlug);
      if (matched) {
        resolvedCategory = {
          ...matched,
          id: String(matched._id),
          parentId: matched.parentId ? String(matched.parentId) : null,
        };
        categoryIds = collectDescendantCategoryIds(matched._id, allCategories);
        subcategories = allCategories
          .filter((c) => c.parentId && String(c.parentId) === String(matched._id))
          .map((c) => ({ ...c, id: String(c._id), parentId: String(c.parentId) }));
      }
    }

    let subCategoryIds: unknown[] | undefined;
    if (subCategorySlug && subCategorySlug !== 'all') {
      const matchedSub = allCategories.find((c) => c.slug === subCategorySlug);
      if (matchedSub) {
        subCategoryIds = collectDescendantCategoryIds(matchedSub._id, allCategories);
      }
    }

    let brandId: unknown;
    if (brandSlug) {
      const brand = await BrandModel.findOne({ slug: brandSlug, isActive: true }).lean();
      if (brand) brandId = brand._id;
    }

    let attributeAliases: Record<string, string[]> | undefined;
    const activeAttrCodes = Object.keys(attributeFilters);
    if (activeAttrCodes.length > 0) {
      const matchedPresets = await ProductAttributePresetModel.find({
        code: { $in: activeAttrCodes },
      })
        .select('code name')
        .lean();
      if (matchedPresets.length > 0) {
        attributeAliases = {};
        for (const p of matchedPresets) {
          const pCode = String(p.code || '').toLowerCase();
          if (pCode && p.name) {
            attributeAliases[pCode] = [String(p.name)];
          }
        }
      }
    }

    const filter = buildProductCatalogFilter({
      q,
      categoryIds,
      categorySlugFallback: !resolvedCategory && categorySlug && categorySlug !== 'all' ? categorySlug : undefined,
      subCategoryIds,
      subCategorySlugFallback: !subCategoryIds && subCategorySlug && subCategorySlug !== 'all' ? subCategorySlug : undefined,
      brandId,
      brandSlug: !brandId && brandSlug ? brandSlug : undefined,
      minPrice,
      maxPrice,
      inStockOnly,
      discountOnly,
      minRating,
      section,
      attributeFilters,
      attributeAliases,
      now,
    });
    if (rawIds.length > 0) {
      filter._id = { $in: rawIds };
    }

    const sortSpec = getCatalogSortSpec(sort, section);
    const needsEffectivePriceSort = sort === 'price_asc' || sort === 'price_desc';

    let total = 0;
    let rawProducts: Array<Record<string, unknown>> = [];

    if (needsEffectivePriceSort) {
      const effectivePriceExpr = buildEffectivePriceMongoExpr(now);
      const [aggResult] = await ProductModel.aggregate([
        { $match: filter },
        { $addFields: { _effectivePrice: effectivePriceExpr } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            items: [
              { $sort: sortSpec },
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
          },
        },
      ]);

      total = aggResult?.metadata?.[0]?.total ?? 0;
      const items = (aggResult?.items || []) as Array<Record<string, unknown>>;
      const populated = await ProductModel.populate(items, {
        path: 'categoryId',
        select: 'name slug attributeSchemaType',
      });
      rawProducts = populated as unknown as Array<Record<string, unknown>>;
    } else {
      const [count, found] = await Promise.all([
        ProductModel.countDocuments(filter),
        ProductModel.find(filter)
          .populate('categoryId', 'name slug attributeSchemaType')
          .sort(sortSpec)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);
      total = count;
      rawProducts = found as unknown as Array<Record<string, unknown>>;
    }

    if (q) {
      await SearchAnalyticsModel.create({
        query: q,
        normalizedQuery: q.toLowerCase(),
        resultCount: total,
      }).catch(() => undefined);
    }

    res.json({
      ok: true,
      products: rawProducts.map((p) => enrichProductPricing(p, now)),
      category: resolvedCategory,
      subcategories,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Product detail by slug
router.get('/:slug', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const product = await ProductModel.findOne({ slug, status: 'published' })
      .populate('categoryId', 'name nameBn slug attributeSchemaType')
      .populate('subCategoryId', 'name nameBn slug')
      .populate('brandId', 'name slug logoUrl')
      .lean();

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found or currently unavailable.');
    }

    const categoryRef = product.categoryId && typeof product.categoryId === 'object' && '_id' in product.categoryId
      ? product.categoryId._id
      : product.categoryId;
    const subCategoryRef = product.subCategoryId && typeof product.subCategoryId === 'object' && '_id' in product.subCategoryId
      ? product.subCategoryId._id
      : product.subCategoryId;

    const sameCategoryRelated = await ProductModel.find({
      _id: { $ne: product._id },
      $or: [
        { categoryId: categoryRef },
        ...(subCategoryRef ? [{ subCategoryId: subCategoryRef }] : []),
      ],
      status: 'published',
    })
      .populate('categoryId', 'name slug')
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(6)
      .lean();

    let relatedRaw = sameCategoryRelated;
    if (relatedRaw.length < 6) {
      const excludeIds = [product._id, ...relatedRaw.map((r) => r._id)];
      const fallbackRelated = await ProductModel.find({
        _id: { $nin: excludeIds },
        status: 'published',
      })
        .populate('categoryId', 'name slug')
        .sort({ isFeatured: -1, soldCount: -1, createdAt: -1 })
        .limit(6 - relatedRaw.length)
        .lean();
      relatedRaw = [...relatedRaw, ...fallbackRelated];
    }

    const publishedQuestions = (product.questions || [])
      .filter((q: { isPublished?: boolean }) => q.isPublished !== false)
      .map((q: { _id?: unknown; userName?: string; askedBy?: string; [k: string]: unknown }) => ({
        ...q,
        id: String(q._id || ''),
        askedBy: q.userName || q.askedBy || 'Customer',
      }));

    const rawAttrValues = Array.isArray(product.attributeValues)
      ? (product.attributeValues as unknown as ProductAttributeValueEntry[])
      : [];

    let mergedAttributeValues = rawAttrValues;
    if (rawAttrValues.length > 0) {
      const attrIds = rawAttrValues
        .map((e) => (e.attributeId ? String(e.attributeId) : ''))
        .filter(Boolean);
      const attrCodes = rawAttrValues
        .map((e) => String(e.code || '').trim().toLowerCase())
        .filter(Boolean);
      const presetQueryOr: Record<string, unknown>[] = [];
      if (attrIds.length > 0) presetQueryOr.push({ _id: { $in: attrIds } });
      if (attrCodes.length > 0) presetQueryOr.push({ code: { $in: attrCodes } });

      if (presetQueryOr.length > 0) {
        const livePresets = await ProductAttributePresetModel.find({ $or: presetQueryOr }).lean();
        mergedAttributeValues = mergeLiveAttributeDefinitions(
          rawAttrValues,
          livePresets as unknown as Parameters<typeof mergeLiveAttributeDefinitions>[1],
        );
      }
    }

    const enriched = enrichProductPricing({
      ...(product as unknown as Record<string, unknown>),
      attributeValues: mergedAttributeValues,
      questions: publishedQuestions,
    });

    const groupedSpecifications = buildGroupedSpecifications({
      attributeValues: mergedAttributeValues,
      specifications: Array.isArray(product.specifications)
        ? (product.specifications as Parameters<typeof buildGroupedSpecifications>[0]['specifications'])
        : [],
      legacyAttributes: product.attributes && typeof product.attributes === 'object'
        ? (product.attributes as Record<string, string>)
        : {},
    });

    res.json({
      ok: true,
      product: enriched,
      groupedSpecifications,
      relatedProducts: relatedRaw.map((p) => enrichProductPricing(p as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
});

// Submit a customer question for a product
router.post('/:slug/questions', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = productQuestionSchema.parse(req.body);
    const product = await ProductModel.findOne({ slug: String(req.params.slug).toLowerCase(), status: 'published' });
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    product.questions.push({
      userId: req.user!._id,
      userName: req.user!.name,
      question: parsed.question,
      answer: '',
      answeredBy: '',
      answeredAt: null,
      isPublished: true,
      createdAt: new Date(),
    } as never);
    await product.save();

    const created = product.questions[product.questions.length - 1];
    res.status(201).json({
      ok: true,
      question: {
        id: String(created._id),
        question: created.question,
        answer: created.answer,
        askedBy: created.userName,
        answeredBy: created.answeredBy,
        answeredAt: created.answeredAt,
        isPublished: created.isPublished,
        createdAt: created.createdAt,
      },
      message: 'Your question has been submitted.',
    });
  } catch (err) {
    next(err);
  }
});

// Public approved reviews + rating distribution for a product
router.get('/:slug/reviews', requireDatabase, authenticateOptional, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await ProductModel.findOne({ slug: String(req.params.slug).toLowerCase() }).select('_id ratingAverage reviewCount').lean();
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 8)));
    const sort = String(req.query.sort || 'newest');

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'highest') sortObj = { rating: -1, createdAt: -1 };
    if (sort === 'lowest') sortObj = { rating: 1, createdAt: -1 };

    const [reviews, total, distribution] = await Promise.all([
      ReviewModel.find({ productId: product._id, status: 'approved' })
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments({ productId: product._id, status: 'approved' }),
      ReviewModel.aggregate([
        { $match: { productId: product._id, status: 'approved' } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
    ]);

    const histogram: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of distribution) {
      histogram[Number(row._id)] = Number(row.count);
    }

    let canReview = false;
    let hasPurchased = false;
    if (req.user) {
      const [existingReview, deliveredOrder] = await Promise.all([
        ReviewModel.findOne({ productId: product._id, userId: req.user._id }).select('_id').lean(),
        OrderModel.findOne({
          userId: req.user._id,
          orderStatus: 'delivered',
          'items.productId': product._id,
        })
          .select('_id')
          .lean(),
      ]);
      hasPurchased = Boolean(deliveredOrder);
      canReview = !existingReview && hasPurchased;
    }

    res.json({
      ok: true,
      reviews,
      summary: {
        average: product.ratingAverage || 0,
        total,
        histogram,
      },
      eligibility: {
        canReview,
        hasPurchased,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Submit a review (requires authenticated customer with a delivered order for this product)
router.post('/:slug/reviews', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().min(3).max(120),
      comment: z.string().trim().min(10).max(1500),
    });
    const parsed = schema.parse(req.body);

    const product = await ProductModel.findOne({ slug: String(req.params.slug).toLowerCase(), status: 'published' });
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    const deliveredOrder = await OrderModel.findOne({
      userId: req.user!._id,
      orderStatus: 'delivered',
      'items.productId': product._id,
    }).sort({ createdAt: -1 });

    if (!deliveredOrder) {
      throw new AppError(
        403,
        'REVIEW_NOT_ELIGIBLE',
        'Only customers who have received a delivered order for this product may submit a review.',
      );
    }

    const existing = await ReviewModel.findOne({ productId: product._id, userId: req.user!._id });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_REVIEW', 'You have already submitted a review for this product.');
    }

    const review = await ReviewModel.create({
      productId: product._id,
      userId: req.user!._id,
      userName: req.user!.name,
      orderId: deliveredOrder._id,
      rating: parsed.rating,
      title: parsed.title,
      comment: parsed.comment,
      isVerifiedPurchase: true,
      status: 'pending',
    });

    res.status(201).json({
      ok: true,
      review,
      message: 'Review submitted and pending moderation approval.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/reviews/:reviewId/report', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await ReviewModel.updateOne(
      { _id: req.params.reviewId },
      { $addToSet: { reportedBy: req.user!._id } },
    );
    res.json({ ok: true, message: 'Review has been flagged for moderator review.' });
  } catch (err) {
    next(err);
  }
});

export default router;
