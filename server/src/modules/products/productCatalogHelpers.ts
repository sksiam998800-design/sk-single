import type mongoose from 'mongoose';
import { expandCrossLingualTerms } from '../../../../src/lib/crossLingualSearch';
import { resolveEffectiveUnitPrice } from '../../../../src/lib/pricingEngine';
import { computeAvailableStock } from '../../../../src/lib/orderStateMachine';

export function enrichProductPricing(prod: Record<string, unknown>, now: Date = new Date()) {
  const pricing = resolveEffectiveUnitPrice(
    {
      basePrice: Number(prod.basePrice || 0),
      salePrice: prod.salePrice != null ? Number(prod.salePrice) : null,
      flashSalePrice: prod.flashSalePrice != null ? Number(prod.flashSalePrice) : null,
      flashSaleStartsAt: prod.flashSaleStartsAt ? String(prod.flashSaleStartsAt) : null,
      flashSaleEndsAt: prod.flashSaleEndsAt ? String(prod.flashSaleEndsAt) : null,
    },
    now,
  );

  const hasVariants = Boolean(prod.hasVariants) && Array.isArray(prod.variants) && prod.variants.length > 0;
  const availableStock = hasVariants
    ? (prod.variants as Array<{ stockOnHand: number; reservedStock?: number; isActive?: boolean }>)
        .filter((v) => v.isActive !== false)
        .reduce((sum, v) => sum + computeAvailableStock(Number(v.stockOnHand || 0), Number(v.reservedStock || 0)), 0)
    : computeAvailableStock(Number(prod.stockOnHand || 0), Number(prod.reservedStock || 0));

  const manageInventory = prod.manageInventory !== false;
  const allowBackorder = Boolean(prod.allowBackorder);

  const normalizedCategoryId =
    prod.categoryId && typeof prod.categoryId === 'object' && '_id' in prod.categoryId
      ? {
          ...(prod.categoryId as Record<string, unknown>),
          id: String((prod.categoryId as { _id: unknown })._id),
        }
      : prod.categoryId
        ? String(prod.categoryId)
        : '';

  const normalizedSubCategoryId =
    prod.subCategoryId && typeof prod.subCategoryId === 'object' && '_id' in prod.subCategoryId
      ? {
          ...(prod.subCategoryId as Record<string, unknown>),
          id: String((prod.subCategoryId as { _id: unknown })._id),
        }
      : prod.subCategoryId
        ? String(prod.subCategoryId)
        : null;

  return {
    ...prod,
    id: String(prod._id),
    categoryId: normalizedCategoryId,
    subCategoryId: normalizedSubCategoryId,
    manageInventory,
    allowBackorder,
    currentPrice: pricing.currentPrice,
    originalPrice: pricing.originalPrice,
    discountPercent: pricing.discountPercent,
    isFlashSaleActive: pricing.isFlashSaleActive,
    availableStock,
  };
}

export function resolveVariantImageUrl(
  variant?: {
    imageUrl?: string | null;
    images?: Array<string | { url?: string | null } | null | undefined>;
  } | null,
  product?: {
    images?: Array<{ url?: string | null } | null | undefined>;
  } | null,
): string {
  const direct = typeof variant?.imageUrl === 'string' ? variant.imageUrl.trim() : '';
  if (direct) return direct;

  const firstVarImg = variant?.images?.[0];
  if (typeof firstVarImg === 'string' && firstVarImg.trim()) {
    return firstVarImg.trim();
  }
  if (firstVarImg && typeof firstVarImg === 'object' && typeof firstVarImg.url === 'string' && firstVarImg.url.trim()) {
    return firstVarImg.url.trim();
  }

  const firstProdImg = product?.images?.[0]?.url;
  return typeof firstProdImg === 'string' ? firstProdImg.trim() : '';
}

export function buildSearchFilter(queryText: string): Record<string, unknown> {
  const { expandedTerms } = expandCrossLingualTerms(queryText);
  if (expandedTerms.length === 0) return {};

  const regexes = expandedTerms
    .slice(0, 12)
    .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  return {
    $or: [
      { name: { $in: regexes } },
      { nameBn: { $in: regexes } },
      { sku: { $in: regexes } },
      { brandName: { $in: regexes } },
      { description: { $in: regexes } },
      { bilingualKeywords: { $in: regexes } },
      { categoryPath: { $in: regexes } },
      { tags: { $in: regexes } },
      { 'attributeValues.value': { $in: regexes } },
      { 'specifications.value': { $in: regexes } },
    ],
  };
}

export interface CategoryLike {
  _id: mongoose.Types.ObjectId | string;
  slug: string;
  parentId?: mongoose.Types.ObjectId | string | null;
}

export function collectDescendantCategoryIds<T extends CategoryLike>(
  rootId: T['_id'],
  allCategories: T[],
): Array<T['_id']> {
  const result: Array<T['_id']> = [rootId];
  const seen = new Set<string>([String(rootId)]);
  const queue: string[] = [String(rootId)];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const cat of allCategories) {
      if (cat.parentId && String(cat.parentId) === currentId) {
        const catIdStr = String(cat._id);
        if (!seen.has(catIdStr)) {
          seen.add(catIdStr);
          result.push(cat._id);
          queue.push(catIdStr);
        }
      }
    }
  }

  return result;
}

export function buildCategoryAncestryPath<T extends CategoryLike>(params: {
  categoryId: string;
  subCategoryId?: string | null;
  allCategories: T[];
}): string[] {
  const byId = new Map(params.allCategories.map((c) => [String(c._id), c]));
  const slugs: string[] = [];
  const seen = new Set<string>();

  const addChain = (startId?: string | null) => {
    let cursorId = startId ? String(startId) : null;
    let guard = 0;
    while (cursorId && guard < 10) {
      guard += 1;
      const node = byId.get(cursorId);
      if (!node) break;
      if (!seen.has(node.slug)) {
        seen.add(node.slug);
        slugs.push(node.slug);
      }
      cursorId = node.parentId ? String(node.parentId) : null;
    }
  };

  addChain(params.categoryId);
  if (params.subCategoryId) {
    addChain(params.subCategoryId);
  }

  return slugs;
}

export interface CatalogFilterInput {
  q?: string;
  categoryIds?: unknown[];
  categorySlugFallback?: string;
  subCategoryIds?: unknown[];
  subCategorySlugFallback?: string;
  brandId?: unknown;
  brandSlug?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStockOnly?: boolean;
  discountOnly?: boolean;
  minRating?: number | null;
  section?: string;
  attributeFilters?: Record<string, string[]>;
  attributeAliases?: Record<string, string[]>;
  now?: Date;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAttributeKeyCandidates(code: string, extraAliases: string[] = []): string[] {
  const spaced = code.replace(/[_-]+/g, ' ').trim();
  const titleWords = spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const underscoreTitle = code
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');

  const keys = new Set<string>([
    code,
    code.charAt(0).toUpperCase() + code.slice(1),
    spaced,
    titleWords,
    underscoreTitle,
    ...extraAliases.map((a) => a.trim()).filter(Boolean),
  ]);
  return Array.from(keys).filter(Boolean);
}

export function buildProductCatalogFilter(input: CatalogFilterInput): Record<string, unknown> {
  const now = input.now ?? new Date();
  const andConditions: Record<string, unknown>[] = [];
  const filter: Record<string, unknown> = { status: 'published' };

  if (input.q && input.q.trim()) {
    const searchClause = buildSearchFilter(input.q.trim());
    if (Object.keys(searchClause).length > 0) {
      andConditions.push(searchClause);
    }
  }

  if (input.categoryIds && input.categoryIds.length > 0) {
    andConditions.push({
      $or: [
        { categoryId: { $in: input.categoryIds } },
        { subCategoryId: { $in: input.categoryIds } },
        ...(input.categorySlugFallback ? [{ categoryPath: input.categorySlugFallback.toLowerCase() }] : []),
      ],
    });
  } else if (input.categorySlugFallback && input.categorySlugFallback !== 'all') {
    andConditions.push({ categoryPath: input.categorySlugFallback.toLowerCase() });
  }

  if (input.subCategoryIds && input.subCategoryIds.length > 0) {
    andConditions.push({
      $or: [
        { subCategoryId: { $in: input.subCategoryIds } },
        { categoryId: { $in: input.subCategoryIds } },
        ...(input.subCategorySlugFallback ? [{ categoryPath: input.subCategorySlugFallback.toLowerCase() }] : []),
      ],
    });
  } else if (input.subCategorySlugFallback) {
    andConditions.push({ categoryPath: input.subCategorySlugFallback.toLowerCase() });
  }

  if (input.brandId) {
    andConditions.push({ brandId: input.brandId });
  } else if (input.brandSlug) {
    andConditions.push({
      brandName: new RegExp(`^${escapeRegExp(input.brandSlug)}$`, 'i'),
    });
  }

  if (input.inStockOnly) {
    andConditions.push({
      $or: [
        { manageInventory: false },
        { allowBackorder: true },
        {
          hasVariants: { $ne: true },
          $expr: {
            $gt: [{ $subtract: ['$stockOnHand', { $ifNull: ['$reservedStock', 0] }] }, 0],
          },
        },
        {
          hasVariants: true,
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$variants', []] },
                    as: 'v',
                    cond: {
                      $and: [
                        { $ne: ['$$v.isActive', false] },
                        {
                          $gt: [
                            { $subtract: ['$$v.stockOnHand', { $ifNull: ['$$v.reservedStock', 0] }] },
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      ],
    });
  }

  if (input.discountOnly) {
    andConditions.push({
      $or: [
        {
          $expr: {
            $and: [
              { $gt: [{ $ifNull: ['$salePrice', 0] }, 0] },
              { $lt: ['$salePrice', '$basePrice'] },
            ],
          },
        },
        {
          flashSalePrice: { $ne: null, $gt: 0 },
          $and: [
            { $or: [{ flashSaleStartsAt: null }, { flashSaleStartsAt: { $lte: now } }] },
            { $or: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { $gte: now } }] },
          ],
          $expr: { $lt: ['$flashSalePrice', '$basePrice'] },
        },
      ],
    });
  }

  if (input.minRating != null && Number.isFinite(input.minRating) && input.minRating > 0) {
    andConditions.push({ ratingAverage: { $gte: input.minRating } });
  }

  if (input.section === 'featured') {
    andConditions.push({ isFeatured: true });
  } else if (input.section === 'new_arrivals') {
    andConditions.push({ isNewArrival: true });
  } else if (input.section === 'premium') {
    andConditions.push({ isPremiumCollection: true });
  }

  if (input.attributeFilters && Object.keys(input.attributeFilters).length > 0) {
    for (const [rawCode, rawValues] of Object.entries(input.attributeFilters)) {
      const code = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const cleanValues = (rawValues || []).map((v) => v.trim()).filter(Boolean);
      if (!code || cleanValues.length === 0) continue;

      const valueRegexes = cleanValues.map((v) => new RegExp(`^${escapeRegExp(v)}$`, 'i'));
      const boolMatchers: unknown[] = [];
      for (const v of cleanValues) {
        const lower = v.toLowerCase();
        if (lower === 'true' || lower === 'yes') {
          boolMatchers.push(true);
          if (lower === 'true') valueRegexes.push(/^yes$/i);
        }
        if (lower === 'false' || lower === 'no') {
          boolMatchers.push(false);
          if (lower === 'false') valueRegexes.push(/^no$/i);
        }
      }

      const keyCandidates = buildAttributeKeyCandidates(code, input.attributeAliases?.[code]);

      andConditions.push({
        $or: [
          {
            attributeValues: {
              $elemMatch: {
                code: new RegExp(`^${escapeRegExp(code)}$`, 'i'),
                value: { $in: [...valueRegexes, ...boolMatchers] },
              },
            },
          },
          ...keyCandidates.map((k) => ({ [`attributes.${k}`]: { $in: valueRegexes } })),
          {
            variants: {
              $elemMatch: {
                isActive: { $ne: false },
                $or: keyCandidates.map((k) => ({ [`options.${k}`]: { $in: valueRegexes } })),
              },
            },
          },
        ],
      });
    }
  }

  // Note: minPrice/maxPrice are handled accurately via effectivePrice expression
  const effectivePriceExpr = buildEffectivePriceMongoExpr(now);
  if (input.minPrice != null && Number.isFinite(input.minPrice)) {
    andConditions.push({
      $expr: { $gte: [effectivePriceExpr, input.minPrice] },
    });
  }
  if (input.maxPrice != null && Number.isFinite(input.maxPrice)) {
    andConditions.push({
      $expr: { $lte: [effectivePriceExpr, input.maxPrice] },
    });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  return filter;
}

export function buildEffectivePriceMongoExpr(now: Date = new Date()): Record<string, unknown> {
  const isFlashActiveExpr = {
    $and: [
      { $ne: [{ $ifNull: ['$flashSalePrice', null] }, null] },
      { $gt: [{ $ifNull: ['$flashSalePrice', 0] }, 0] },
      { $lt: ['$flashSalePrice', '$basePrice'] },
      {
        $or: [
          { $eq: [{ $ifNull: ['$flashSaleStartsAt', null] }, null] },
          { $lte: ['$flashSaleStartsAt', now] },
        ],
      },
      {
        $or: [
          { $eq: [{ $ifNull: ['$flashSaleEndsAt', null] }, null] },
          { $gte: ['$flashSaleEndsAt', now] },
        ],
      },
    ],
  };

  const hasValidSaleExpr = {
    $and: [
      { $ne: [{ $ifNull: ['$salePrice', null] }, null] },
      { $gt: [{ $ifNull: ['$salePrice', 0] }, 0] },
      { $lt: ['$salePrice', '$basePrice'] },
    ],
  };

  return {
    $cond: [
      isFlashActiveExpr,
      '$flashSalePrice',
      { $cond: [hasValidSaleExpr, '$salePrice', '$basePrice'] },
    ],
  };
}

export function getCatalogSortSpec(sort: string, section?: string): Record<string, 1 | -1> {
  if (sort === 'newest' || sort === 'latest' || section === 'latest' || section === 'new_arrivals') {
    return { createdAt: -1 };
  }
  if (sort === 'trending' || section === 'trending') {
    return { soldCount: -1, ratingAverage: -1, updatedAt: -1 };
  }
  if (sort === 'rating') {
    return { ratingAverage: -1, reviewCount: -1, soldCount: -1 };
  }
  if (sort === 'price_asc') {
    return { _effectivePrice: 1, createdAt: -1 };
  }
  if (sort === 'price_desc') {
    return { _effectivePrice: -1, createdAt: -1 };
  }
  return { soldCount: -1, createdAt: -1 };
}
