import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { OrderModel, PaymentTransactionModel, serializePaymentTransaction } from './order.model';
import { ProductModel } from '../products/product.model';
import { resolveVariantImageUrl } from '../products/productCatalogHelpers';
import { CartModel } from '../cart/cart.model';
import { CouponModel, CouponRedemptionModel, DiscountRuleModel } from '../coupons/coupon.model';
import { InventoryMovementModel } from '../inventory/inventoryMovement.model';
import { ReturnRequestModel } from '../reviews/review.model';
import { HomepageConfigModel } from '../cms/cms.model';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import {
  calculateOrderTotals,
  evaluateCouponDiscount,
  evaluateDiscountRules,
  resolveEffectiveUnitPrice,
} from '../../../../src/lib/pricingEngine';
import {
  buildAvailableDeliveryOptions,
  calculateShippingCharge,
  validateBangladeshAddressHierarchy,
} from '../../../../src/lib/bdLocations';
import {
  canCustomerCancelOrder,
  canCustomerRequestCancellation,
  canCustomerRequestReturn,
  getOrderCancellationEligibility,
  shouldRestoreStockOnCancel,
} from '../../../../src/lib/orderStateMachine';
import { sendTransactionalEmail } from '../../services/email.service';
import {
  createAndInitiatePaymentTransaction,
  getPaymentCapabilities,
  getUnconfiguredMethodMessage,
  isPaymentMethodConfigured,
  retryOrderPaymentForCustomer,
} from '../../services/payment.service';

const router = Router();

const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(80).optional(),
  deliveryMethod: z.enum(['standard', 'express']).default('standard'),
  deliveryOptionCode: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash', 'nagad', 'card']),
  couponCode: z.string().trim().max(40).nullable().optional(),
  shippingAddress: z.object({
    recipientName: z.string().trim().min(2).max(100),
    email: z.string().trim().email('Please provide a valid email address.').max(140).optional(),
    phone: z.string().trim().min(10).max(24),
    division: z.string().trim().min(2),
    district: z.string().trim().min(2),
    upazila: z.string().trim().min(2),
    area: z.string().trim().min(2),
    house: z.string().trim().min(2).max(220),
    road: z.string().trim().max(140).optional(),
    landmark: z.string().trim().max(140).optional(),
    postalCode: z.string().trim().max(12).optional(),
    deliveryInstructions: z.string().trim().max(240).optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Cart cannot be empty.'),
});

const quoteSchema = z.object({
  deliveryMethod: z.enum(['standard', 'express']).default('standard'),
  deliveryOptionCode: z.string().trim().max(40).optional(),
  couponCode: z.string().trim().max(40).nullable().optional(),
  division: z.string().trim().optional().default(''),
  district: z.string().trim().optional().default(''),
  upazila: z.string().trim().optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `NVR-${datePart}-${rand}`;
}

async function releaseReservedItems(
  reserved: Array<{ productId: string; variantId?: string | null; quantity: number; sku: string; name: string }>,
  reason: string,
  referenceId: string,
) {
  for (const item of reserved) {
    if (item.variantId) {
      await ProductModel.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.reservedStock': -item.quantity } },
      ).catch(() => undefined);
    } else {
      await ProductModel.updateOne(
        { _id: item.productId },
        { $inc: { reservedStock: -item.quantity } },
      ).catch(() => undefined);
    }
    await InventoryMovementModel.create({
      productId: item.productId,
      variantId: item.variantId || null,
      sku: item.sku,
      productName: item.name,
      type: 'release',
      delta: item.quantity,
      previousStockOnHand: 0,
      newStockOnHand: 0,
      previousReserved: item.quantity,
      newReserved: 0,
      reason,
      referenceId,
    }).catch(() => undefined);
  }
}

// Checkout quote preview (authoritative pricing + delivery options)
router.post('/checkout/quote', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = quoteSchema.parse(req.body);
    const cmsCfg = await HomepageConfigModel.findOne({ key: 'main' }).lean();
    const pricingLineInputs: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      categoryId?: string;
    }> = [];

    for (const reqItem of parsed.items) {
      if (!mongoose.isValidObjectId(reqItem.productId)) {
        throw new AppError(400, 'INVALID_PRODUCT', 'Invalid product in checkout quote.');
      }
      const prod = await ProductModel.findOne({ _id: reqItem.productId, status: 'published' }).lean();
      if (!prod) {
        throw new AppError(404, 'PRODUCT_UNAVAILABLE', 'One or more products are unavailable.');
      }
      if (prod.hasVariants && prod.variants?.length > 0 && reqItem.variantId) {
        const v = prod.variants.find((item: { _id: unknown; isActive?: boolean }) => String(item._id) === reqItem.variantId && item.isActive !== false);
        if (!v) throw new AppError(404, 'VARIANT_NOT_FOUND', `Selected variant for ${prod.name} was not found.`);
        const pricing = resolveEffectiveUnitPrice({
          basePrice: v.price ?? prod.basePrice,
          salePrice: v.salePrice ?? prod.salePrice,
          flashSalePrice: prod.flashSalePrice,
          flashSaleStartsAt: prod.flashSaleStartsAt,
          flashSaleEndsAt: prod.flashSaleEndsAt,
        });
        pricingLineInputs.push({
          productId: String(prod._id),
          variantId: String(v._id),
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          categoryId: String(prod.categoryId),
        });
      } else {
        const pricing = resolveEffectiveUnitPrice({
          basePrice: prod.basePrice,
          salePrice: prod.salePrice,
          flashSalePrice: prod.flashSalePrice,
          flashSaleStartsAt: prod.flashSaleStartsAt,
          flashSaleEndsAt: prod.flashSaleEndsAt,
        });
        pricingLineInputs.push({
          productId: String(prod._id),
          variantId: null,
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          categoryId: String(prod.categoryId),
        });
      }
    }

    let couponDiscount = 0;
    let couponApplied: string | null = null;
    if (parsed.couponCode) {
      const coupon = await CouponModel.findOne({ code: parsed.couponCode.toUpperCase() }).lean();
      if (coupon) {
        const customerUsedCount = await CouponRedemptionModel.countDocuments({
          couponId: coupon._id,
          userId: req.user!._id,
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
          pricingLineInputs,
        );
        if (evalRes.valid) {
          couponDiscount = evalRes.discountAmount;
          couponApplied = coupon.code;
        }
      }
    } else {
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
          pricingLineInputs,
        );
        couponDiscount = ruleEval.discountAmount;
      }
    }

    const rawSubtotal = pricingLineInputs.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
    const shipping = calculateShippingCharge({
      division: parsed.division,
      district: parsed.district,
      upazila: parsed.upazila,
      subtotal: rawSubtotal,
      deliveryMethod: parsed.deliveryMethod,
      deliveryOptionCode: parsed.deliveryOptionCode,
      deliveryOptions: cmsCfg?.deliveryOptions,
      config: cmsCfg?.shippingSettings,
      deliveryZones: cmsCfg?.deliveryZones,
    });
    const availableDeliveryOptions = buildAvailableDeliveryOptions({
      division: parsed.division,
      district: parsed.district,
      upazila: parsed.upazila,
      subtotal: rawSubtotal,
      deliveryOptions: cmsCfg?.deliveryOptions,
      config: cmsCfg?.shippingSettings,
      deliveryZones: cmsCfg?.deliveryZones,
    });

    const taxRate =
      cmsCfg?.taxSettings?.enabled && cmsCfg?.taxSettings?.ratePercent
        ? Number(cmsCfg.taxSettings.ratePercent) / 100
        : 0;
    const taxInclusive = Boolean(cmsCfg?.taxSettings?.inclusive);
    const totals = calculateOrderTotals({
      items: pricingLineInputs,
      couponDiscount,
      shippingCharge: shipping.charge,
      taxRate,
      taxInclusive,
    });

    const capabilities = getPaymentCapabilities();

    res.json({
      ok: true,
      quote: {
        ...totals,
        couponCode: couponApplied,
        shippingZone: shipping.zone,
        deliveryOptionCode: shipping.deliveryOptionCode,
        deliveryMethodName: shipping.deliveryMethodName,
        deliveryEta: shipping.estimatedDays,
        freeShippingApplied: shipping.freeShippingApplied,
        availableDeliveryOptions,
        gatewayConfigured: capabilities.anyOnline,
        gatewayCapabilities: capabilities,
        paymentMethods: cmsCfg?.paymentMethods || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated checkout ONLY
router.post('/checkout', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const reservedTrack: Array<{ productId: string; variantId?: string | null; quantity: number; sku: string; name: string }> = [];
  let appliedCouponIdForRollback: unknown = null;
  let createdOrderIdForRollback: unknown = null;

  try {
    const parsed = checkoutSchema.parse(req.body);

    // 1. Idempotency protection against duplicate submit
    if (parsed.idempotencyKey) {
      const existingOrder = await OrderModel.findOne({
        userId: req.user!._id,
        idempotencyKey: parsed.idempotencyKey,
      }).lean();
      if (existingOrder) {
        const existingTx =
          existingOrder.paymentMethod !== 'cod'
            ? await PaymentTransactionModel.findOne({ orderId: existingOrder._id }).sort({ createdAt: -1 }).lean()
            : null;
        res.status(200).json({
          ok: true,
          order: { ...existingOrder, id: String(existingOrder._id) },
          gatewayUrl:
            existingTx && ['initiated', 'pending'].includes(existingTx.status) ? existingTx.gatewayUrl || null : null,
          transaction: existingTx ? serializePaymentTransaction(existingTx as unknown as Record<string, unknown>) : null,
          deduplicated: true,
        });
        return;
      }
    }

    // 2. Validate Bangladesh address hierarchy
    const hierarchyCheck = validateBangladeshAddressHierarchy({
      division: parsed.shippingAddress.division,
      district: parsed.shippingAddress.district,
      upazila: parsed.shippingAddress.upazila,
      area: parsed.shippingAddress.area,
    });
    if (!hierarchyCheck.valid) {
      throw new AppError(400, 'INVALID_BD_ADDRESS', hierarchyCheck.reason || 'Invalid delivery address hierarchy.');
    }

    // 3. Verify CMS payment channel toggles & online gateway availability BEFORE reserving stock
    const cmsCfg = await HomepageConfigModel.findOne({ key: 'main' }).lean();
    const pm = cmsCfg?.paymentMethods;
    if (pm) {
      const channelDisabled =
        (parsed.paymentMethod === 'cod' && pm.codEnabled === false) ||
        (parsed.paymentMethod === 'sslcommerz' && pm.sslcommerzEnabled === false) ||
        (parsed.paymentMethod === 'bkash' && pm.bkashEnabled === false) ||
        (parsed.paymentMethod === 'nagad' && pm.nagadEnabled === false) ||
        (parsed.paymentMethod === 'card' && pm.cardEnabled === false);
      if (channelDisabled) {
        throw new AppError(400, 'PAYMENT_METHOD_DISABLED', 'Selected payment method is currently disabled.');
      }
    }

    if (parsed.paymentMethod !== 'cod' && !isPaymentMethodConfigured(parsed.paymentMethod)) {
      throw new AppError(
        503,
        'PAYMENT_GATEWAY_UNCONFIGURED',
        getUnconfiguredMethodMessage(parsed.paymentMethod),
      );
    }

    // 4. Atomically reserve stock & compute authoritative server-side prices
    const orderItems = [];
    const pricingLineInputs = [];

    for (const reqItem of parsed.items) {
      const prod = await ProductModel.findOne({ _id: reqItem.productId, status: 'published' });
      if (!prod) {
        throw new AppError(404, 'PRODUCT_UNAVAILABLE', 'One or more products in your cart are no longer available.');
      }

      const skipStockLock = prod.manageInventory === false || Boolean(prod.allowBackorder);

      if (prod.hasVariants && prod.variants.length > 0) {
        if (!reqItem.variantId) {
          throw new AppError(400, 'VARIANT_REQUIRED', `Variant selection is required for ${prod.name}.`);
        }

        let variantReserved = null;
        if (skipStockLock) {
          const matchedVariant = prod.variants.find(
            (item: { _id: unknown; isActive?: boolean }) =>
              String(item._id) === reqItem.variantId && item.isActive !== false,
          );
          if (!matchedVariant) {
            throw new AppError(404, 'VARIANT_NOT_FOUND', `Selected variant for ${prod.name} was not found.`);
          }
          if (prod.manageInventory !== false) {
            variantReserved = await ProductModel.findOneAndUpdate(
              { _id: prod._id, 'variants._id': reqItem.variantId },
              { $inc: { 'variants.$.reservedStock': reqItem.quantity } },
              { new: true },
            );
          } else {
            variantReserved = prod;
          }
        } else {
          // Atomic conditional update to prevent overselling
          const updatedProd = await ProductModel.findOneAndUpdate(
            {
              _id: prod._id,
              variants: {
                $elemMatch: {
                  _id: reqItem.variantId,
                  isActive: true,
                  $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reservedStock'] }, reqItem.quantity] },
                },
              },
            },
            { $inc: { 'variants.$.reservedStock': reqItem.quantity } },
            { new: true },
          );

          // Fallback check because $expr inside $elemMatch isn't supported across all Mongo versions
          variantReserved = updatedProd;
          if (!variantReserved) {
            const v = prod.variants.find((item: { _id: unknown; isActive?: boolean }) => String(item._id) === reqItem.variantId && item.isActive !== false);
            if (!v) throw new AppError(404, 'VARIANT_NOT_FOUND', `Selected variant for ${prod.name} was not found.`);
            const maxAllowed = v.stockOnHand - reqItem.quantity;
            variantReserved = await ProductModel.findOneAndUpdate(
              {
                _id: prod._id,
                variants: {
                  $elemMatch: {
                    _id: reqItem.variantId,
                    isActive: true,
                    reservedStock: { $lte: maxAllowed },
                  },
                },
              },
              { $inc: { 'variants.$.reservedStock': reqItem.quantity } },
              { new: true },
            );
          }
        }

        if (!variantReserved) {
          throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${prod.name}.`);
        }

        const variant = variantReserved.variants.find((v: { _id: unknown }) => String(v._id) === reqItem.variantId)!;
        if (prod.manageInventory !== false) {
          reservedTrack.push({
            productId: String(prod._id),
            variantId: String(variant._id),
            quantity: reqItem.quantity,
            sku: variant.sku,
            name: `${prod.name} (${variant.title})`,
          });
        }

        const pricing = resolveEffectiveUnitPrice({
          basePrice: variant.price ?? prod.basePrice,
          salePrice: variant.salePrice ?? prod.salePrice,
          flashSalePrice: prod.flashSalePrice,
          flashSaleStartsAt: prod.flashSaleStartsAt,
          flashSaleEndsAt: prod.flashSaleEndsAt,
        });

        orderItems.push({
          productId: prod._id,
          variantId: String(variant._id),
          sku: variant.sku,
          name: prod.name,
          slug: prod.slug,
          imageUrl: resolveVariantImageUrl(variant as Parameters<typeof resolveVariantImageUrl>[0], prod as Parameters<typeof resolveVariantImageUrl>[1]),
          variantOptions:
            variant.options instanceof Map
              ? Object.fromEntries(variant.options.entries())
              : Object.fromEntries(Object.entries(variant.options || {})),
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          originalPrice: pricing.originalPrice,
          lineTotal: pricing.currentPrice * reqItem.quantity,
        });

        pricingLineInputs.push({
          productId: String(prod._id),
          variantId: String(variant._id),
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          categoryId: String(prod.categoryId),
        });
      } else {
        let reservedProd = prod;
        if (skipStockLock) {
          if (prod.manageInventory !== false) {
            const updated = await ProductModel.findOneAndUpdate(
              { _id: prod._id, status: 'published' },
              { $inc: { reservedStock: reqItem.quantity } },
              { new: true },
            );
            if (!updated) throw new AppError(404, 'PRODUCT_UNAVAILABLE', 'Product is unavailable.');
            reservedProd = updated;
          }
        } else {
          // Atomic conditional update for non-variant product
          const updated = await ProductModel.findOneAndUpdate(
            {
              _id: prod._id,
              status: 'published',
              $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reservedStock'] }, reqItem.quantity] },
            },
            { $inc: { reservedStock: reqItem.quantity } },
            { new: true },
          );
          if (!updated) {
            throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${prod.name}.`);
          }
          reservedProd = updated;
        }

        if (prod.manageInventory !== false) {
          reservedTrack.push({
            productId: String(reservedProd._id),
            variantId: null,
            quantity: reqItem.quantity,
            sku: reservedProd.sku,
            name: reservedProd.name,
          });
        }

        const pricing = resolveEffectiveUnitPrice({
          basePrice: prod.basePrice,
          salePrice: prod.salePrice,
          flashSalePrice: prod.flashSalePrice,
          flashSaleStartsAt: prod.flashSaleStartsAt,
          flashSaleEndsAt: prod.flashSaleEndsAt,
        });

        orderItems.push({
          productId: prod._id,
          variantId: null,
          sku: prod.sku,
          name: prod.name,
          slug: prod.slug,
          imageUrl: prod.images?.[0]?.url || '',
          variantOptions: {},
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          originalPrice: pricing.originalPrice,
          lineTotal: pricing.currentPrice * reqItem.quantity,
        });

        pricingLineInputs.push({
          productId: String(prod._id),
          variantId: null,
          quantity: reqItem.quantity,
          unitPrice: pricing.currentPrice,
          categoryId: String(prod.categoryId),
        });
      }
    }

    // 5. Server-side coupon validation and atomic usage increment
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    let appliedCouponId: unknown = null;

    if (parsed.couponCode) {
      const coupon = await CouponModel.findOne({ code: parsed.couponCode.toUpperCase() });
      if (!coupon) {
        throw new AppError(400, 'INVALID_COUPON', 'Coupon code does not exist.');
      }
      const customerUsedCount = await CouponRedemptionModel.countDocuments({
        couponId: coupon._id,
        userId: req.user!._id,
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
        pricingLineInputs,
      );

      if (!evalRes.valid) {
        throw new AppError(400, 'COUPON_INELIGIBLE', evalRes.reason || 'Coupon cannot be applied.');
      }

      if (coupon.usageLimit != null) {
        const incremented = await CouponModel.findOneAndUpdate(
          { _id: coupon._id, usedCount: { $lt: coupon.usageLimit } },
          { $inc: { usedCount: 1 } },
        );
        if (!incremented) {
          throw new AppError(409, 'COUPON_LIMIT_REACHED', 'Coupon usage limit has just been reached.');
        }
      } else {
        await CouponModel.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
      }

      couponDiscount = evalRes.discountAmount;
      appliedCouponCode = coupon.code;
      appliedCouponId = coupon._id;
      appliedCouponIdForRollback = coupon._id;
    } else {
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
          pricingLineInputs,
        );
        couponDiscount = ruleEval.discountAmount;
      }
    }

    // 6. Shipping & Totals (honor CMS shippingSettings + custom deliveryZones)
    const rawSubtotal = pricingLineInputs.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
    const shipping = calculateShippingCharge({
      division: parsed.shippingAddress.division,
      district: parsed.shippingAddress.district,
      upazila: parsed.shippingAddress.upazila,
      subtotal: rawSubtotal,
      deliveryMethod: parsed.deliveryMethod,
      deliveryOptionCode: parsed.deliveryOptionCode,
      deliveryOptions: cmsCfg?.deliveryOptions,
      config: cmsCfg?.shippingSettings,
      deliveryZones: cmsCfg?.deliveryZones,
    });

    const taxRate = cmsCfg?.taxSettings?.enabled && cmsCfg?.taxSettings?.ratePercent
      ? Number(cmsCfg.taxSettings.ratePercent) / 100
      : 0;
    const taxInclusive = Boolean(cmsCfg?.taxSettings?.inclusive);

    const totals = calculateOrderTotals({
      items: pricingLineInputs,
      couponDiscount,
      shippingCharge: shipping.charge,
      taxRate,
      taxInclusive,
    });

    const codMaxAmount = Number(cmsCfg?.paymentMethods?.codMaxAmount || 0);
    if (parsed.paymentMethod === 'cod' && codMaxAmount > 0 && totals.total > codMaxAmount) {
      throw new AppError(
        400,
        'COD_LIMIT_EXCEEDED',
        `Cash on Delivery is available up to ৳${codMaxAmount.toLocaleString('en-IN')}. Please select an online payment option.`,
      );
    }

    const orderNumber = generateOrderNumber();
    const checkoutEmail = parsed.shippingAddress.email || req.user!.email;

    // 7. Create persistent Order
    const order = await OrderModel.create({
      orderNumber,
      userId: req.user!._id,
      customerName: parsed.shippingAddress.recipientName || req.user!.name,
      customerEmail: checkoutEmail,
      customerPhone: parsed.shippingAddress.phone,
      items: orderItems,
      shippingAddress: {
        ...parsed.shippingAddress,
        email: checkoutEmail,
      },
      deliveryMethod: parsed.deliveryMethod,
      deliveryOptionCode: shipping.deliveryOptionCode,
      deliveryMethodName: shipping.deliveryMethodName,
      deliveryEta: shipping.estimatedDays,
      shippingZone: shipping.zone,
      couponCode: appliedCouponCode,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingCharge: totals.shippingCharge,
      tax: totals.tax,
      total: totals.total,
      paymentMethod: parsed.paymentMethod,
      paymentStatus: parsed.paymentMethod === 'cod' ? 'unpaid' : 'initiated',
      orderStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      idempotencyKey: parsed.idempotencyKey,
      statusHistory: [
        {
          toStatus: 'pending',
          actorId: req.user!._id,
          actorName: req.user!.name,
          reason: 'Order placed by customer',
          timestamp: new Date(),
        },
      ],
    });
    createdOrderIdForRollback = order._id;

    if (appliedCouponId) {
      await CouponRedemptionModel.create({
        couponId: appliedCouponId,
        code: appliedCouponCode!,
        userId: req.user!._id,
        orderId: order._id,
        discountAmount: totals.discount,
      });
    }

    // Record stock reservations
    for (const r of reservedTrack) {
      await InventoryMovementModel.create({
        productId: r.productId,
        variantId: r.variantId || null,
        sku: r.sku,
        productName: r.name,
        type: 'reserve',
        delta: -r.quantity,
        previousStockOnHand: 0,
        newStockOnHand: 0,
        previousReserved: 0,
        newReserved: r.quantity,
        reason: `Reserved for order ${orderNumber}`,
        referenceId: orderNumber,
        actorId: req.user!._id,
        actorName: req.user!.name,
      }).catch(() => undefined);
    }

    // For COD orders, clear purchased items from cart & send order confirmation email immediately.
    // For online payments, keep cart intact until gateway payment verification confirms `paid`.
    let gatewayUrl: string | null = null;
    let paymentTransaction: ReturnType<typeof serializePaymentTransaction> | null = null;

    if (parsed.paymentMethod === 'cod') {
      const userCart = await CartModel.findOne({ userId: req.user!._id });
      if (userCart) {
        const orderedKeys = new Set(
          parsed.items.map((item) => `${item.productId}::${item.variantId ? String(item.variantId) : 'default'}`),
        );
        userCart.items = userCart.items.filter(
          (line: { productId: unknown; variantId?: unknown }) =>
            !orderedKeys.has(`${String(line.productId)}::${line.variantId ? String(line.variantId) : 'default'}`),
        );
        userCart.couponCode = null;
        await userCart.save();
      }

      await sendTransactionalEmail({
        to: checkoutEmail,
        template: 'order_confirmation',
        subject: `NOVARA COMMERCE — Order ${order.orderNumber} Confirmed`,
        html: `<h2>Thank you for your order, ${order.customerName}!</h2><p>Order Number: <strong>${order.orderNumber}</strong></p><p>Total: <strong>৳${order.total.toLocaleString()}</strong></p><p>Payment Method: Cash on Delivery</p>`,
      });
    } else {
      const initiated = await createAndInitiatePaymentTransaction({
        order,
        paymentMethod: parsed.paymentMethod,
        clientIp: req.ip,
        idempotencyKey: parsed.idempotencyKey,
      });
      gatewayUrl = initiated.gatewayUrl;
      paymentTransaction = initiated.transaction;
    }

    res.status(201).json({
      ok: true,
      order: { ...order.toObject(), id: String(order._id) },
      transaction: paymentTransaction,
      gatewayUrl,
    });
  } catch (err) {
    if (createdOrderIdForRollback) {
      await CouponRedemptionModel.deleteMany({ orderId: createdOrderIdForRollback }).catch(() => undefined);
      await OrderModel.deleteOne({ _id: createdOrderIdForRollback }).catch(() => undefined);
    }
    if (appliedCouponIdForRollback) {
      await CouponModel.updateOne({ _id: appliedCouponIdForRollback }, { $inc: { usedCount: -1 } }).catch(() => undefined);
    }
    if (reservedTrack.length > 0) {
      await releaseReservedItems(reservedTrack, 'Checkout aborted rollback', 'ROLLBACK');
    }
    next(err);
  }
});

// Customer's own orders
router.get('/my', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));

    const [total, orders] = await Promise.all([
      OrderModel.countDocuments({ userId: req.user!._id }),
      OrderModel.find({ userId: req.user!._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      ok: true,
      orders: orders.map((o) => ({ ...o, id: String(o._id) })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// Public Track Order (requires matching orderNumber AND phone/email)
router.post('/track', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      orderNumber: z.string().trim().min(4),
      contact: z.string().trim().min(4),
    });
    const parsed = schema.parse(req.body);
    const contactClean = parsed.contact.toLowerCase();

    const order = await OrderModel.findOne({
      orderNumber: parsed.orderNumber.toUpperCase(),
      $or: [
        { customerEmail: contactClean },
        { customerPhone: parsed.contact },
        { 'shippingAddress.phone': parsed.contact },
      ],
    })
      .select('orderNumber orderStatus paymentStatus fulfillmentStatus paymentMethod total subtotal discount shippingCharge createdAt courierName trackingNumber statusHistory items shippingAddress.division shippingAddress.district')
      .lean();

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'No order matched that Order Number and email/phone.');
    }

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
});

// Single customer order detail (strict ownership check)
router.get('/:id', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    const order = await OrderModel.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    const [returnRequest, paymentTransactions] = await Promise.all([
      ReturnRequestModel.findOne({ orderId: order._id }).lean(),
      PaymentTransactionModel.find({ orderId: order._id }).sort({ createdAt: -1 }).lean(),
    ]);
    res.json({
      ok: true,
      order: {
        ...order,
        id: String(order._id),
        paymentTransactions: paymentTransactions.map((t) =>
          serializePaymentTransaction(t as unknown as Record<string, unknown>),
        ),
      },
      returnRequest,
    });
  } catch (err) {
    next(err);
  }
});

// Retry or switch online payment method for an eligible unpaid/failed/cancelled order
router.post('/:id/retry-payment', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = z
      .object({
        paymentMethod: z.enum(['sslcommerz', 'bkash', 'nagad', 'card']).optional(),
      })
      .parse(req.body || {});

    const result = await retryOrderPaymentForCustomer({
      orderId: req.params.id,
      userId: req.user!._id,
      paymentMethod: parsed.paymentMethod,
      clientIp: req.ip,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Customer directly cancels eligible pending order (atomic status check prevents concurrent double-cancel)
router.post('/:id/cancel', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    const { reason } = z.object({ reason: z.string().trim().min(3).max(240) }).parse(req.body);

    const existing = await OrderModel.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
    if (!existing) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (!canCustomerCancelOrder(existing.orderStatus)) {
      const eligibility = getOrderCancellationEligibility({
        orderStatus: existing.orderStatus,
        cancellationRequest: existing.cancellationRequest
          ? {
              ...existing.cancellationRequest,
              requestedAt: new Date(existing.cancellationRequest.requestedAt).toISOString(),
              reviewedAt: existing.cancellationRequest.reviewedAt
                ? new Date(existing.cancellationRequest.reviewedAt).toISOString()
                : null,
            }
          : null,
      });
      throw new AppError(
        400,
        'CANCEL_NOT_ELIGIBLE',
        eligibility.message || `Orders in "${existing.orderStatus}" status cannot be directly cancelled by the customer.`,
      );
    }

    const nextPaymentStatus =
      existing.paymentStatus === 'paid'
        ? 'refund_pending'
        : ['initiated', 'pending', 'authorized'].includes(existing.paymentStatus)
          ? 'cancelled'
          : existing.paymentStatus;

    const updatedOrder = await OrderModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id, orderStatus: 'pending' },
      {
        $set: {
          orderStatus: 'cancelled',
          fulfillmentStatus: 'cancelled',
          paymentStatus: nextPaymentStatus,
          cancellationReason: reason,
        },
        $push: {
          statusHistory: {
            fromStatus: 'pending',
            toStatus: 'cancelled',
            actorId: req.user!._id,
            actorName: req.user!.name,
            reason,
            timestamp: new Date(),
          },
          cancellationHistory: {
            action: 'direct_cancel',
            actorId: req.user!._id,
            actorName: req.user!.name,
            reason,
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updatedOrder) {
      throw new AppError(409, 'CANCEL_CONFLICT', 'Order status changed before cancellation completed. Please refresh.');
    }

    if (shouldRestoreStockOnCancel('pending', existing.paymentStatus)) {
      await releaseReservedItems(
        existing.items.map((i: { productId: unknown; variantId?: string | null; quantity: number; sku: string; name: string }) => ({
          productId: String(i.productId),
          variantId: i.variantId || null,
          quantity: i.quantity,
          sku: i.sku,
          name: i.name,
        })),
        `Cancelled by customer: ${reason}`,
        existing.orderNumber,
      );
    }

    if (existing.paymentStatus === 'paid') {
      await PaymentTransactionModel.updateMany(
        { orderId: existing._id, status: 'paid' },
        { $set: { status: 'refund_pending' } },
      ).catch(() => undefined);
    } else if (['initiated', 'pending', 'authorized'].includes(existing.paymentStatus)) {
      await PaymentTransactionModel.updateMany(
        { orderId: existing._id, status: { $in: ['initiated', 'pending', 'authorized'] } },
        { $set: { status: 'cancelled', cancelledAt: new Date(), failureReason: `Order cancelled: ${reason}` } },
      ).catch(() => undefined);
    }

    await sendTransactionalEmail({
      to: existing.customerEmail,
      template: 'order_cancelled',
      subject: `NOVARA COMMERCE — Order ${existing.orderNumber} Cancelled`,
      html: `<p>Hello ${existing.customerName},</p><p>Your order <strong>${existing.orderNumber}</strong> has been cancelled as requested.</p><p>Reason: ${reason}</p>`,
    }).catch(() => undefined);

    res.json({ ok: true, order: { ...updatedOrder.toObject(), id: String(updatedOrder._id) } });
  } catch (err) {
    next(err);
  }
});

// Customer checks cancellation eligibility & status for an order
router.get('/:id/cancellation-request', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    const order = await OrderModel.findOne({ _id: req.params.id, userId: req.user!._id })
      .select('orderNumber orderStatus cancellationRequest cancellationHistory')
      .lean();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    const eligibility = getOrderCancellationEligibility({
      orderStatus: order.orderStatus,
      cancellationRequest: order.cancellationRequest
        ? {
            ...order.cancellationRequest,
            requestedAt: new Date(order.cancellationRequest.requestedAt).toISOString(),
            reviewedAt: order.cancellationRequest.reviewedAt
              ? new Date(order.cancellationRequest.reviewedAt).toISOString()
              : null,
          }
        : null,
    });
    res.json({
      ok: true,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      cancellationRequest: order.cancellationRequest || null,
      cancellationHistory: order.cancellationHistory || [],
      eligibility,
    });
  } catch (err) {
    next(err);
  }
});

// Customer submits a cancellation request for confirmed / processing / packed orders
router.post('/:id/cancellation-request', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    const parsed = z
      .object({
        reason: z.string().trim().min(3, 'Please provide a cancellation reason.').max(240),
        message: z.string().trim().max(600).optional().default(''),
      })
      .parse(req.body);

    const existing = await OrderModel.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
    if (!existing) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (existing.cancellationRequest?.status === 'pending') {
      throw new AppError(409, 'CANCELLATION_ALREADY_PENDING', 'A cancellation request is already pending admin review for this order.');
    }

    if (!canCustomerRequestCancellation(existing.orderStatus)) {
      const eligibility = getOrderCancellationEligibility({
        orderStatus: existing.orderStatus,
        cancellationRequest: existing.cancellationRequest
          ? {
              ...existing.cancellationRequest,
              requestedAt: new Date(existing.cancellationRequest.requestedAt).toISOString(),
              reviewedAt: existing.cancellationRequest.reviewedAt
                ? new Date(existing.cancellationRequest.reviewedAt).toISOString()
                : null,
            }
          : null,
      });
      throw new AppError(400, 'CANCELLATION_REQUEST_INELIGIBLE', eligibility.message);
    }

    const requestPayload = {
      status: 'pending' as const,
      reason: parsed.reason,
      message: parsed.message || '',
      requestedBy: req.user!._id,
      requestedAt: new Date(),
      reviewedBy: null,
      reviewedByName: '',
      reviewedAt: null,
      adminNotes: '',
    };

    const updatedOrder = await OrderModel.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user!._id,
        orderStatus: { $in: ['confirmed', 'processing', 'packed'] },
        'cancellationRequest.status': { $ne: 'pending' },
      },
      {
        $set: { cancellationRequest: requestPayload },
        $push: {
          cancellationHistory: {
            action: 'requested',
            actorId: req.user!._id,
            actorName: req.user!.name,
            reason: parsed.reason,
            message: parsed.message || '',
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updatedOrder) {
      throw new AppError(409, 'CANCELLATION_REQUEST_CONFLICT', 'Unable to submit cancellation request because the order status changed.');
    }

    await sendTransactionalEmail({
      to: existing.customerEmail,
      template: 'order_cancellation_requested',
      subject: `NOVARA COMMERCE — Cancellation Request Received (${existing.orderNumber})`,
      html: `<p>Hello ${existing.customerName},</p><p>We have received your cancellation request for order <strong>${existing.orderNumber}</strong>.</p><p>Reason: ${parsed.reason}</p><p>Our operations team will review your request shortly.</p>`,
    }).catch(() => undefined);

    res.status(201).json({
      ok: true,
      order: { ...updatedOrder.toObject(), id: String(updatedOrder._id) },
      cancellationRequest: updatedOrder.cancellationRequest,
    });
  } catch (err) {
    next(err);
  }
});

// Customer requests return on delivered order
router.post('/:id/return', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      reason: z.string().trim().min(3).max(200),
      details: z.string().trim().max(1000).optional(),
    });
    const parsed = schema.parse(req.body);

    const order = await OrderModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (!canCustomerRequestReturn(order.orderStatus, order.deliveredAt)) {
      throw new AppError(400, 'RETURN_NOT_ELIGIBLE', 'This order is not eligible for return (must be delivered within 7 days).');
    }

    const existing = await ReturnRequestModel.findOne({ orderId: order._id });
    if (existing) {
      throw new AppError(409, 'RETURN_ALREADY_REQUESTED', 'A return request already exists for this order.');
    }

    const returnReq = await ReturnRequestModel.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: req.user!._id,
      reason: parsed.reason,
      details: parsed.details,
      items: order.items.map((i: { productId: unknown; sku: string; name: string; quantity: number }) => ({
        productId: i.productId,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
      })),
      refundAmount: order.total,
    });

    order.orderStatus = 'return_requested';
    order.statusHistory.push({
      fromStatus: 'delivered',
      toStatus: 'return_requested',
      actorId: req.user!._id as unknown as typeof order.statusHistory[0]['actorId'],
      actorName: req.user!.name,
      reason: parsed.reason,
      timestamp: new Date(),
    });
    await order.save();

    res.status(201).json({ ok: true, returnRequest: returnReq });
  } catch (err) {
    next(err);
  }
});

export default router;
