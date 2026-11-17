import mongoose from 'mongoose';
import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { CartModel, WishlistModel } from './cart.model';
import { ProductModel } from '../products/product.model';
import { CouponModel, CouponRedemptionModel, DiscountRuleModel } from '../coupons/coupon.model';
import { AddressModel } from '../addresses/address.model';
import { OrderModel } from '../orders/order.model';
import { ReviewModel } from '../reviews/review.model';
import { WalletTransactionModel } from '../users/user.model';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import {
  evaluateCouponDiscount,
  evaluateDiscountRules,
  mergeCartLines,
  resolveEffectiveUnitPrice,
} from '../../../../src/lib/pricingEngine';
import { computeAvailableStock } from '../../../../src/lib/orderStateMachine';
import { validateBangladeshAddressHierarchy } from '../../../../src/lib/bdLocations';
import { enrichProductPricing, resolveVariantImageUrl } from '../products/productCatalogHelpers';

const router = Router();

async function hydrateCart(userId: unknown) {
  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    cart = await CartModel.create({ userId, items: [], couponCode: null });
  }

  const productIds = cart.items.map((i: { productId: unknown }) => i.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const prodMap = new Map(products.map((p) => [String(p._id), p]));

  const hydratedItems = [];
  for (const line of cart.items) {
    const prod = prodMap.get(String(line.productId));
    if (!prod || prod.status !== 'published') continue;

    const variant = line.variantId
      ? prod.variants.find((v: { _id: unknown; isActive?: boolean }) => String(v._id) === String(line.variantId) && v.isActive !== false)
      : null;

    const rawStock = variant
      ? computeAvailableStock(variant.stockOnHand, variant.reservedStock)
      : computeAvailableStock(prod.stockOnHand, prod.reservedStock);
    const unlimitedOrBackorder = prod.manageInventory === false || Boolean(prod.allowBackorder);
    const availableStock = unlimitedOrBackorder ? Math.max(rawStock, 99) : rawStock;

    const pricing = resolveEffectiveUnitPrice({
      basePrice: variant?.price ?? prod.basePrice,
      salePrice: variant?.salePrice ?? prod.salePrice,
      flashSalePrice: prod.flashSalePrice,
      flashSaleStartsAt: prod.flashSaleStartsAt,
      flashSaleEndsAt: prod.flashSaleEndsAt,
    });

    hydratedItems.push({
      productId: String(prod._id),
      variantId: variant ? String(variant._id) : null,
      slug: prod.slug,
      name: prod.name,
      shortDescription: prod.shortDescription || '',
      sku: variant?.sku || prod.sku,
      variantTitle: variant?.title || null,
      imageUrl: resolveVariantImageUrl(variant as Parameters<typeof resolveVariantImageUrl>[0], prod as Parameters<typeof resolveVariantImageUrl>[1]),
      unitPrice: pricing.currentPrice,
      originalPrice: pricing.originalPrice,
      discountPercent: pricing.discountPercent,
      quantity: Math.min(line.quantity, Math.max(1, availableStock || 1)),
      availableStock,
      isAvailable: availableStock >= line.quantity && availableStock > 0,
      selected: (line as { selected?: boolean }).selected !== false,
      categoryId: String(prod.categoryId),
    });
  }

  const selectedItems = hydratedItems.filter((i) => i.selected !== false);
  const subtotal = selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  let discount = 0;
  let couponMessage: string | null = null;
  let activeCouponCode = cart.couponCode || null;
  let appliedRuleName: string | null = null;

  if (activeCouponCode) {
    const coupon = await CouponModel.findOne({ code: activeCouponCode.toUpperCase() }).lean();
    if (!coupon) {
      activeCouponCode = null;
      cart.couponCode = null;
      await cart.save();
    } else if (selectedItems.length > 0) {
      const customerUsedCount = await CouponRedemptionModel.countDocuments({
        couponId: coupon._id,
        userId,
      });
      const evalRes = evaluateCouponDiscount(
        {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          minOrderAmount: coupon.minOrderAmount,
          startsAt: coupon.startsAt,
          endsAt: coupon.endsAt,
          isActive: coupon.isActive,
          usageLimit: coupon.usageLimit,
          usedCount: coupon.usedCount,
          perCustomerLimit: coupon.perCustomerLimit,
          customerUsedCount,
          eligibleCategoryIds: coupon.eligibleCategoryIds?.map(String),
          eligibleProductIds: coupon.eligibleProductIds?.map(String),
        },
        selectedItems,
      );
      if (evalRes.valid) {
        discount = evalRes.discountAmount;
      } else {
        couponMessage = evalRes.reason || 'Coupon is not eligible.';
        activeCouponCode = null;
      }
    }
  }

  if (!activeCouponCode && selectedItems.length > 0) {
    const activeRules = await DiscountRuleModel.find({ isActive: true }).lean();
    if (activeRules.length > 0) {
      const ruleEval = evaluateDiscountRules(
        activeRules.map((r) => ({
          id: String(r._id),
          name: r.name,
          ruleType: r.ruleType,
          value: r.value,
          minQty: r.minQty,
          minSpend: r.minSpend,
          isActive: r.isActive,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
        })),
        selectedItems,
      );
      if (ruleEval.discountAmount > 0) {
        discount = ruleEval.discountAmount;
        appliedRuleName = ruleEval.appliedRuleName;
      }
    }
  }

  return {
    items: hydratedItems,
    couponCode: activeCouponCode,
    appliedRuleName,
    couponMessage,
    subtotal,
    discount,
  };
}

// Cart routes (authenticated persistence)
router.get('/cart', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await hydrateCart(req.user!._id);
    res.json({ ok: true, cart: data });
  } catch (err) {
    next(err);
  }
});

router.post('/cart/items', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      productId: z.string().min(1),
      variantId: z.string().nullable().optional(),
      quantity: z.number().int().min(1).max(99),
    });
    const parsed = schema.parse(req.body);

    const product = await ProductModel.findOne({ _id: parsed.productId, status: 'published' });
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product is unavailable.');
    }

    let availableStock = computeAvailableStock(product.stockOnHand, product.reservedStock);
    if (product.hasVariants && product.variants.length > 0) {
      if (!parsed.variantId) {
        throw new AppError(400, 'VARIANT_REQUIRED', 'Please select a product variant.');
      }
      const variant = product.variants.find((v: { _id: unknown; isActive?: boolean }) => String(v._id) === parsed.variantId && v.isActive !== false);
      if (!variant) {
        throw new AppError(404, 'VARIANT_NOT_FOUND', 'Selected product variant is unavailable.');
      }
      availableStock = computeAvailableStock(variant.stockOnHand, variant.reservedStock);
    }

    const unlimitedOrBackorder = product.manageInventory === false || Boolean(product.allowBackorder);
    const effectiveMaxStock = unlimitedOrBackorder ? Math.max(availableStock, 99) : availableStock;

    if (effectiveMaxStock <= 0) {
      throw new AppError(409, 'OUT_OF_STOCK', 'This product is currently out of stock.');
    }

    let cart = await CartModel.findOne({ userId: req.user!._id });
    if (!cart) {
      cart = await CartModel.create({ userId: req.user!._id, items: [] });
    }

    const merged = mergeCartLines(
      cart.items.map((i: { productId: unknown; variantId?: string | null; quantity: number }) => ({
        productId: String(i.productId),
        variantId: i.variantId || null,
        quantity: i.quantity,
      })),
      [
        {
          productId: parsed.productId,
          variantId: parsed.variantId || null,
          quantity: parsed.quantity,
          maxStock: effectiveMaxStock,
        },
      ],
    );

    cart.items = merged.map((m) => ({
      productId: m.productId as unknown as typeof cart.items[0]['productId'],
      variantId: m.variantId || null,
      quantity: m.quantity,
    }));
    await cart.save();

    const data = await hydrateCart(req.user!._id);
    res.json({ ok: true, cart: data });
  } catch (err) {
    next(err);
  }
});

router.patch('/cart/items', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      productId: z.string().min(1),
      variantId: z.string().nullable().optional(),
      quantity: z.number().int().min(0).max(99),
    });
    const parsed = schema.parse(req.body);

    const cart = await CartModel.findOne({ userId: req.user!._id });
    if (!cart) {
      res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
      return;
    }

    const variantKey = parsed.variantId ? String(parsed.variantId) : null;
    if (parsed.quantity <= 0) {
      cart.items = cart.items.filter(
        (i: { productId: unknown; variantId?: string | null }) =>
          !(String(i.productId) === parsed.productId && (i.variantId || null) === variantKey),
      );
    } else {
      const product = await ProductModel.findById(parsed.productId);
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      const variant = variantKey ? product.variants.find((v: { _id: unknown }) => String(v._id) === variantKey) : null;
      const rawAvailable = variant
        ? computeAvailableStock(variant.stockOnHand, variant.reservedStock)
        : computeAvailableStock(product.stockOnHand, product.reservedStock);
      const available =
        product.manageInventory === false || product.allowBackorder ? Math.max(rawAvailable, 99) : rawAvailable;

      if (parsed.quantity > available) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Only ${available} units available in stock.`);
      }

      const target = cart.items.find(
        (i: { productId: unknown; variantId?: string | null; quantity: number }) =>
          String(i.productId) === parsed.productId && (i.variantId || null) === variantKey,
      );
      if (target) target.quantity = parsed.quantity;
    }

    await cart.save();
    res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
  } catch (err) {
    next(err);
  }
});

router.patch('/cart/selection', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      productId: z.string().min(1).optional(),
      variantId: z.string().nullable().optional(),
      selected: z.boolean(),
      selectAll: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);

    const cart = await CartModel.findOne({ userId: req.user!._id });
    if (!cart) {
      res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
      return;
    }

    if (parsed.selectAll) {
      for (const item of cart.items) {
        item.selected = parsed.selected;
      }
    } else if (parsed.productId) {
      const variantKey = parsed.variantId ? String(parsed.variantId) : null;
      const target = cart.items.find(
        (i: { productId: unknown; variantId?: string | null }) =>
          String(i.productId) === parsed.productId && (i.variantId || null) === variantKey,
      );
      if (target) {
        target.selected = parsed.selected;
      }
    }

    await cart.save();
    res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/cart', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cart = await CartModel.findOne({ userId: req.user!._id });
    if (cart) {
      cart.items = [];
      cart.couponCode = null;
      await cart.save();
    }
    res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
  } catch (err) {
    next(err);
  }
});

router.post('/cart/merge', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      items: z.array(
        z.object({
          productId: z.string().min(1),
          variantId: z.string().nullable().optional(),
          quantity: z.number().int().min(1).max(99),
        }),
      ),
    });
    const parsed = schema.parse(req.body);

    let cart = await CartModel.findOne({ userId: req.user!._id });
    if (!cart) {
      cart = await CartModel.create({ userId: req.user!._id, items: [] });
    }

    // Verify products exist and clamp against real stock
    const incomingValidated = [];
    for (const item of parsed.items) {
      const prod = await ProductModel.findOne({ _id: item.productId, status: 'published' });
      if (!prod) continue;
      const variant = item.variantId ? prod.variants.find((v: { _id: unknown }) => String(v._id) === item.variantId) : null;
      const rawAvailable = variant
        ? computeAvailableStock(variant.stockOnHand, variant.reservedStock)
        : computeAvailableStock(prod.stockOnHand, prod.reservedStock);
      const available =
        prod.manageInventory === false || prod.allowBackorder ? Math.max(rawAvailable, 99) : rawAvailable;
      if (available > 0) {
        incomingValidated.push({
          productId: String(prod._id),
          variantId: variant ? String(variant._id) : null,
          quantity: item.quantity,
          maxStock: available,
        });
      }
    }

    const merged = mergeCartLines(
      cart.items.map((i: { productId: unknown; variantId?: string | null; quantity: number }) => ({
        productId: String(i.productId),
        variantId: i.variantId || null,
        quantity: i.quantity,
      })),
      incomingValidated,
    );

    cart.items = merged.map((m) => ({
      productId: m.productId as unknown as typeof cart.items[0]['productId'],
      variantId: m.variantId || null,
      quantity: m.quantity,
    }));
    await cart.save();

    res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
  } catch (err) {
    next(err);
  }
});

router.post('/cart/coupon', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = z.object({ code: z.string().trim().max(40) }).parse(req.body);
    const cart = await CartModel.findOne({ userId: req.user!._id });
    if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart not found.');

    if (!code) {
      cart.couponCode = null;
      await cart.save();
      res.json({ ok: true, cart: await hydrateCart(req.user!._id) });
      return;
    }

    const coupon = await CouponModel.findOne({ code: code.toUpperCase() }).lean();
    if (!coupon) {
      throw new AppError(404, 'INVALID_COUPON', 'Coupon code not found.');
    }

    cart.couponCode = coupon.code;
    await cart.save();
    const data = await hydrateCart(req.user!._id);
    if (data.couponMessage) {
      cart.couponCode = null;
      await cart.save();
      throw new AppError(400, 'COUPON_INELIGIBLE', data.couponMessage);
    }

    res.json({ ok: true, cart: data });
  } catch (err) {
    next(err);
  }
});

async function hydrateWishlist(userId: unknown) {
  const wl = await WishlistModel.findOne({ userId }).lean();
  const rawIds = (wl?.productIds || []).map((id: unknown) => String(id));
  if (rawIds.length === 0) {
    return { products: [], productIds: [] as string[], count: 0 };
  }

  const docs = await ProductModel.find({
    _id: { $in: rawIds },
    status: 'published',
  }).lean();

  const docMap = new Map(docs.map((p) => [String(p._id), p]));
  const products = [];
  const validIds: string[] = [];

  for (const id of rawIds) {
    const p = docMap.get(id);
    if (!p) continue;
    validIds.push(id);
    const enriched = enrichProductPricing(p as unknown as Record<string, unknown>) as Record<string, unknown>;
    products.push({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      shortDescription: p.shortDescription || '',
      brandName: p.brandName || '',
      categoryId: String(p.categoryId || ''),
      images: p.images || [],
      currentPrice: enriched.currentPrice,
      originalPrice: enriched.originalPrice,
      discountPercent: enriched.discountPercent,
      isFlashSaleActive: Boolean(enriched.isFlashSaleActive),
      availableStock: enriched.availableStock,
      stockOnHand: p.stockOnHand,
      reservedStock: p.reservedStock,
      manageInventory: p.manageInventory !== false,
      allowBackorder: Boolean(p.allowBackorder),
      hasVariants: Boolean(p.hasVariants) && Array.isArray(p.variants) && p.variants.length > 0,
      variants: enriched.variants || [],
      ratingAverage: Number(p.ratingAverage || 0),
      reviewCount: Number(p.reviewCount || 0),
      soldCount: Number(p.soldCount || 0),
      attributeValues:
        p.attributeValues instanceof Map
          ? Object.fromEntries(p.attributeValues.entries())
          : (p.attributeValues || {}),
      specifications: p.specifications || [],
      features: p.features || [],
    });
  }

  return { products, productIds: validIds, count: validIds.length };
}

// Wishlist routes (authenticated DB persistence + guest merge support)
router.get('/wishlist', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await hydrateWishlist(req.user!._id);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.get('/wishlist/count', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await hydrateWishlist(req.user!._id);
    res.json({ ok: true, count: data.count, productIds: data.productIds });
  } catch (err) {
    next(err);
  }
});

router.get('/wishlist/status/:productId', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!mongoose.isValidObjectId(productId)) {
      res.json({ ok: true, wishlisted: false });
      return;
    }
    const wl = await WishlistModel.findOne({ userId: req.user!._id }).lean();
    const wishlisted = Boolean(wl?.productIds?.some((id: unknown) => String(id) === productId));
    res.json({ ok: true, wishlisted });
  } catch (err) {
    next(err);
  }
});

router.post('/wishlist', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(400, 'INVALID_PRODUCT_ID', 'Invalid product ID.');
    }
    const product = await ProductModel.findOne({ _id: productId, status: 'published' }).select('_id').lean();
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product is unavailable or not published.');
    }

    await WishlistModel.findOneAndUpdate(
      { userId: req.user!._id },
      { $addToSet: { productIds: product._id } },
      { upsert: true, new: true },
    );

    const data = await hydrateWishlist(req.user!._id);
    res.status(201).json({ ok: true, wishlisted: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.post('/wishlist/toggle', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(400, 'INVALID_PRODUCT_ID', 'Invalid product ID.');
    }

    let wl = await WishlistModel.findOne({ userId: req.user!._id });
    if (!wl) {
      wl = await WishlistModel.create({ userId: req.user!._id, productIds: [] });
    }

    const exists = wl.productIds.some((id: unknown) => String(id) === productId);
    if (exists) {
      await WishlistModel.updateOne(
        { _id: wl._id },
        { $pull: { productIds: new mongoose.Types.ObjectId(productId) } },
      );
    } else {
      const product = await ProductModel.findOne({ _id: productId, status: 'published' }).select('_id').lean();
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product is unavailable or not published.');
      }
      await WishlistModel.updateOne(
        { _id: wl._id },
        { $addToSet: { productIds: product._id } },
      );
    }

    const data = await hydrateWishlist(req.user!._id);
    res.json({ ok: true, wishlisted: !exists, ...data });
  } catch (err) {
    next(err);
  }
});

router.post('/wishlist/merge', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productIds } = z
      .object({
        productIds: z.array(z.string().min(1)).max(100),
      })
      .parse(req.body);

    const validObjIds = Array.from(new Set(productIds))
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validObjIds.length > 0) {
      const published = await ProductModel.find({
        _id: { $in: validObjIds },
        status: 'published',
      })
        .select('_id')
        .lean();

      const publishedIds = published.map((p) => p._id);
      if (publishedIds.length > 0) {
        await WishlistModel.findOneAndUpdate(
          { userId: req.user!._id },
          { $addToSet: { productIds: { $each: publishedIds } } },
          { upsert: true, new: true },
        );
      }
    }

    const data = await hydrateWishlist(req.user!._id);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.delete('/wishlist/:productId', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(400, 'INVALID_PRODUCT_ID', 'Invalid product ID.');
    }
    await WishlistModel.updateOne(
      { userId: req.user!._id },
      { $pull: { productIds: new mongoose.Types.ObjectId(productId) } },
    );
    const data = await hydrateWishlist(req.user!._id);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.delete('/wishlist', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await WishlistModel.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: { productIds: [] } },
      { upsert: true },
    );
    res.json({ ok: true, products: [], productIds: [], count: 0 });
  } catch (err) {
    next(err);
  }
});

// Customer My Account Overview Dashboard
router.get('/dashboard', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const userId = req.user!._id;
    const [recentOrders, totalOrders, activeOrders, deliveredOrders, wlData, reviewCount, addressCount, activeCouponsCount, walletTxCount] =
      await Promise.all([
        OrderModel.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('orderNumber total orderStatus paymentStatus cancellationRequest items createdAt')
          .lean(),
        OrderModel.countDocuments({ userId }),
        OrderModel.countDocuments({ userId, orderStatus: { $in: ['pending', 'confirmed', 'processing', 'packed', 'shipped'] } }),
        OrderModel.countDocuments({ userId, orderStatus: 'delivered' }),
        hydrateWishlist(userId),
        ReviewModel.countDocuments({ userId }),
        AddressModel.countDocuments({ userId }),
        CouponModel.countDocuments({
          isActive: true,
          $and: [
            { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
            { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
          ],
        }),
        WalletTransactionModel.countDocuments({ userId }),
      ]);

    const spentAgg = await OrderModel.aggregate([
      { $match: { userId, orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, totalSpent: { $sum: '$total' } } },
    ]);

    res.json({
      ok: true,
      summary: {
        totalOrders,
        activeOrders,
        deliveredOrders,
        wishlistCount: wlData.count,
        reviewCount,
        addressCount,
        activeCouponsCount,
        walletBalance: Number((req.user as unknown as { walletBalance?: number })?.walletBalance || 0),
        walletTransactionsCount: walletTxCount,
        totalSpent: Number(spentAgg[0]?.totalSpent || 0),
      },
      recentOrders: recentOrders.map((o) => ({ ...o, id: String(o._id) })),
    });
  } catch (err) {
    next(err);
  }
});

// Customer's own product reviews
router.get('/reviews', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await ReviewModel.find({ userId: req.user!._id })
      .populate('productId', 'name slug images basePrice salePrice')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ok: true,
      reviews: reviews.map((r) => {
        const prod = r.productId as unknown as { _id?: unknown; name?: string; slug?: string; images?: Array<{ url: string }> } | null;
        return {
          id: String(r._id),
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          status: r.status,
          isVerifiedPurchase: r.isVerifiedPurchase,
          createdAt: r.createdAt,
          product: prod
            ? {
                id: String(prod._id),
                name: prod.name || 'Product',
                slug: prod.slug || '',
                imageUrl: prod.images?.[0]?.url || '',
              }
            : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// Customer's available coupons + personal redemption counts
router.get('/coupons', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [coupons, redemptions] = await Promise.all([
      CouponModel.find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ createdAt: -1 })
        .lean(),
      CouponRedemptionModel.find({ userId: req.user!._id }).lean(),
    ]);

    const usedMap = new Map<string, number>();
    for (const red of redemptions) {
      const k = String(red.couponId);
      usedMap.set(k, (usedMap.get(k) || 0) + 1);
    }

    res.json({
      ok: true,
      coupons: coupons.map((c) => ({
        id: String(c._id),
        code: c.code,
        description: c.description || '',
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscountAmount: c.maxDiscountAmount ?? null,
        minOrderAmount: c.minOrderAmount || 0,
        endsAt: c.endsAt || null,
        perCustomerLimit: c.perCustomerLimit ?? null,
        customerUsedCount: usedMap.get(String(c._id)) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Customer Wallet balance and transactions
router.get('/wallet', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const transactions = await WalletTransactionModel.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({
      ok: true,
      balance: Number((req.user as unknown as { walletBalance?: number })?.walletBalance || 0),
      transactions: transactions.map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        description: t.description,
        referenceId: t.referenceId || '',
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Address CRUD routes with Bangladesh hierarchy validation
const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default('Home'),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(24),
  division: z.string().trim().min(2),
  district: z.string().trim().min(2),
  upazila: z.string().trim().min(2),
  area: z.string().trim().min(2),
  house: z.string().trim().min(2).max(140),
  road: z.string().trim().max(140).optional(),
  landmark: z.string().trim().max(140).optional(),
  postalCode: z.string().trim().max(12).optional(),
  deliveryInstructions: z.string().trim().max(240).optional(),
  isDefault: z.boolean().optional(),
});

router.get('/addresses', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const addresses = await AddressModel.find({ userId: req.user!._id }).sort({ isDefault: -1, createdAt: -1 }).lean();
    res.json({ ok: true, addresses: addresses.map((a) => ({ ...a, id: String(a._id) })) });
  } catch (err) {
    next(err);
  }
});

router.post('/addresses', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addressSchema.parse(req.body);
    const hierarchyCheck = validateBangladeshAddressHierarchy({
      division: parsed.division,
      district: parsed.district,
      upazila: parsed.upazila,
      area: parsed.area,
    });
    if (!hierarchyCheck.valid) {
      throw new AppError(400, 'INVALID_BD_ADDRESS', hierarchyCheck.reason || 'Invalid Bangladesh address hierarchy.');
    }

    const count = await AddressModel.countDocuments({ userId: req.user!._id });
    const shouldBeDefault = Boolean(parsed.isDefault) || count === 0;
    if (shouldBeDefault) {
      await AddressModel.updateMany({ userId: req.user!._id }, { $set: { isDefault: false } });
    }

    const address = await AddressModel.create({
      ...parsed,
      userId: req.user!._id,
      isDefault: shouldBeDefault,
    });
    res.status(201).json({ ok: true, address: { ...address.toObject(), id: String(address._id) } });
  } catch (err) {
    next(err);
  }
});

router.patch('/addresses/:id', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addressSchema.parse(req.body);
    const hierarchyCheck = validateBangladeshAddressHierarchy({
      division: parsed.division,
      district: parsed.district,
      upazila: parsed.upazila,
      area: parsed.area,
    });
    if (!hierarchyCheck.valid) {
      throw new AppError(400, 'INVALID_BD_ADDRESS', hierarchyCheck.reason || 'Invalid Bangladesh address hierarchy.');
    }

    if (parsed.isDefault) {
      await AddressModel.updateMany({ userId: req.user!._id }, { $set: { isDefault: false } });
    }

    const updated = await AddressModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: parsed },
      { new: true },
    );
    if (!updated) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');
    res.json({ ok: true, address: { ...updated.toObject(), id: String(updated._id) } });
  } catch (err) {
    next(err);
  }
});

router.delete('/addresses/:id', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await AddressModel.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!deleted) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');
    if (deleted.isDefault) {
      const nextDefault = await AddressModel.findOne({ userId: req.user!._id }).sort({ createdAt: -1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
