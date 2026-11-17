import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env, getPaymentIntegrationsStatus } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { OrderModel, PaymentTransactionModel, serializePaymentTransaction, type IOrder } from '../modules/orders/order.model';
import { ProductModel } from '../modules/products/product.model';
import { CartModel } from '../modules/cart/cart.model';
import { InventoryMovementModel } from '../modules/inventory/inventoryMovement.model';
import { HomepageConfigModel } from '../modules/cms/cms.model';
import { SystemLogModel } from '../modules/support/support.model';
import { recordAuditLog } from '../middleware/auth.middleware';
import { sendTransactionalEmail } from './email.service';
import {
  canRetryOrderPayment,
  computeRefundableBalance,
  canRefundPaymentTransaction,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentTransactionStatus,
} from '../../../src/lib/orderStateMachine';
import {
  amountsMatch,
  redactGatewayPayload,
  type GatewayInitiateOutput,
  type GatewayVerifyOutput,
} from './gateways/types';
import {
  initiateSslCommerzSession,
  querySslCommerzByTranId,
  refundSslCommerzPayment,
  verifySslCommerzPayment,
} from './gateways/sslcommerz.adapter';
import {
  executeAndVerifyBkashPayment,
  initiateBkashPayment,
  queryBkashPaymentStatus,
  refundBkashPayment,
} from './gateways/bkash.adapter';
import { initiateNagadPayment, verifyNagadPayment } from './gateways/nagad.adapter';

export interface InitiateGatewayParams {
  orderNumber: string;
  transactionId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  clientIp?: string;
  shippingAddress: {
    house: string;
    area: string;
    upazila: string;
    district: string;
    division: string;
    postalCode?: string;
  };
}

export function getPaymentCapabilities() {
  const status = getPaymentIntegrationsStatus();
  return {
    cod: { configured: true, mode: 'offline' as const },
    bkash: { configured: status.bkash, mode: status.modes.bkash },
    nagad: { configured: status.nagad, mode: status.modes.nagad },
    sslcommerz: { configured: status.sslcommerz, mode: status.modes.sslcommerz },
    card: { configured: status.card, mode: status.modes.card },
    anyOnline: status.anyOnline,
  };
}

export function resolveProviderForMethod(paymentMethod: PaymentMethod): PaymentProvider {
  if (paymentMethod === 'cod') return 'cod';
  if (paymentMethod === 'bkash') return 'bkash';
  if (paymentMethod === 'nagad') return 'nagad';
  return 'sslcommerz';
}

export function isPaymentMethodConfigured(paymentMethod: PaymentMethod): boolean {
  if (paymentMethod === 'cod') return true;
  const status = getPaymentIntegrationsStatus();
  if (paymentMethod === 'bkash') return status.bkash;
  if (paymentMethod === 'nagad') return status.nagad;
  if (paymentMethod === 'card') return status.card;
  return status.sslcommerz;
}

export function getUnconfiguredMethodMessage(paymentMethod: PaymentMethod): string {
  switch (paymentMethod) {
    case 'bkash':
      return 'bKash merchant credentials (BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD) are not configured on this server.';
    case 'nagad':
      return 'Nagad merchant credentials (NAGAD_MERCHANT_ID, NAGAD_MERCHANT_NUMBER, NAGAD_PUBLIC_KEY, NAGAD_PRIVATE_KEY) are not configured on this server.';
    case 'card':
      return 'Card payment gateway credentials (PAYMENT_STORE_ID, PAYMENT_STORE_PASSWORD) are not configured on this server.';
    case 'sslcommerz':
      return 'SSLCommerz credentials (PAYMENT_STORE_ID, PAYMENT_STORE_PASSWORD) are not configured on this server.';
    default:
      return 'Selected payment gateway is not configured.';
  }
}

async function writePaymentSystemLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  details?: Record<string, unknown>,
) {
  await SystemLogModel.create({
    level,
    source: 'payment.gateway',
    message,
    details: details ? redactGatewayPayload(details) : undefined,
  }).catch(() => undefined);
}

// Legacy compatibility wrapper
export async function initiateSslCommerzPayment(params: InitiateGatewayParams): Promise<{
  gatewayUrl: string;
  sessionKey?: string;
}> {
  const res = await initiateSslCommerzSession({
    ...params,
    currency: 'BDT',
    paymentMethod: params.paymentMethod || 'sslcommerz',
  });
  return { gatewayUrl: res.gatewayUrl, sessionKey: res.gatewaySessionKey };
}

// Legacy compatibility wrapper
export async function validateSslCommerzTransaction(valId: string): Promise<{
  verified: boolean;
  status?: string;
  amount?: number;
  tranId?: string;
  bankTranId?: string;
  raw?: Record<string, unknown>;
}> {
  const res = await verifySslCommerzPayment({
    transactionId: '',
    expectedAmount: 1,
    gatewayValidationId: valId,
  });
  return {
    verified: res.verified,
    status: res.status,
    amount: res.verifiedAmount,
    tranId: res.tranId,
    bankTranId: res.bankTransactionId,
    raw: res.raw,
  };
}

export async function dispatchGatewaySession(params: InitiateGatewayParams): Promise<GatewayInitiateOutput> {
  const method = params.paymentMethod || 'sslcommerz';
  if (!isPaymentMethodConfigured(method)) {
    throw new AppError(503, 'PAYMENT_GATEWAY_UNCONFIGURED', getUnconfiguredMethodMessage(method));
  }

  const input = {
    orderNumber: params.orderNumber,
    transactionId: params.transactionId,
    amount: params.amount,
    currency: 'BDT' as const,
    paymentMethod: method,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    clientIp: params.clientIp,
    shippingAddress: params.shippingAddress,
  };

  if (method === 'bkash') {
    return initiateBkashPayment(input);
  }
  if (method === 'nagad') {
    return initiateNagadPayment(input);
  }
  return initiateSslCommerzSession(input);
}

export async function createAndInitiatePaymentTransaction(params: {
  order: IOrder;
  paymentMethod: PaymentMethod;
  clientIp?: string;
  idempotencyKey?: string;
}): Promise<{ transaction: ReturnType<typeof serializePaymentTransaction>; gatewayUrl: string }> {
  const { order, paymentMethod, clientIp, idempotencyKey } = params;
  const provider = resolveProviderForMethod(paymentMethod);
  const tranId = `TXN-${order.orderNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + env.PAYMENT_TIMEOUT_MINUTES * 60_000);

  const tx = await PaymentTransactionModel.create({
    orderId: order._id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    provider,
    paymentMethod,
    transactionId: tranId,
    idempotencyKey,
    amount: order.total,
    requestedAmount: order.total,
    currency: 'BDT',
    status: 'initiated',
    initiatedAt: new Date(),
    expiresAt,
  });

  try {
    const gateway = await dispatchGatewaySession({
      orderNumber: order.orderNumber,
      transactionId: tranId,
      amount: order.total,
      paymentMethod,
      customerName: order.shippingAddress?.recipientName || order.customerName,
      customerEmail: order.shippingAddress?.email || order.customerEmail,
      customerPhone: order.shippingAddress?.phone || order.customerPhone,
      clientIp,
      shippingAddress: order.shippingAddress,
    });

    tx.gatewayPaymentId = gateway.gatewayPaymentId;
    tx.gatewaySessionKey = gateway.gatewaySessionKey;
    tx.gatewayUrl = gateway.gatewayUrl;
    tx.rawPayload = gateway.raw;
    await tx.save();

    await writePaymentSystemLog('info', `Initiated ${provider} payment session for ${order.orderNumber}`, {
      orderNumber: order.orderNumber,
      transactionId: tranId,
      provider,
      paymentMethod,
      amount: order.total,
      gatewayPaymentId: gateway.gatewayPaymentId,
    });

    return {
      transaction: serializePaymentTransaction(tx.toObject()),
      gatewayUrl: gateway.gatewayUrl,
    };
  } catch (err) {
    tx.status = 'failed';
    tx.failedAt = new Date();
    tx.failureReason = err instanceof Error ? err.message : 'Payment gateway initiation failed';
    await tx.save().catch(() => undefined);

    await writePaymentSystemLog('error', `Failed to initiate ${provider} payment for ${order.orderNumber}`, {
      orderNumber: order.orderNumber,
      transactionId: tranId,
      provider,
      error: tx.failureReason,
    });
    throw err;
  }
}

export async function releaseOrderReservationSafe(order: IOrder, reason: string) {
  for (const item of order.items) {
    const prodMeta = await ProductModel.findById(item.productId).select('manageInventory').lean().catch(() => null);
    if (prodMeta && prodMeta.manageInventory === false) continue;

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
      referenceId: order.orderNumber,
    }).catch(() => undefined);
  }
}

async function clearCartItemsForOrder(order: IOrder) {
  if (!order.userId) return;
  const userCart = await CartModel.findOne({ userId: order.userId });
  if (!userCart) return;

  const orderedKeys = new Set(
    order.items.map((item) => `${String(item.productId)}::${item.variantId ? String(item.variantId) : 'default'}`),
  );
  userCart.items = userCart.items.filter(
    (line: { productId: unknown; variantId?: unknown }) =>
      !orderedKeys.has(`${String(line.productId)}::${line.variantId ? String(line.variantId) : 'default'}`),
  );
  userCart.couponCode = null;
  await userCart.save();
}

export async function markPaymentFailedOrCancelled(params: {
  tranId?: string;
  gatewayPaymentId?: string;
  outcome: 'failed' | 'cancelled' | 'expired';
  reason: string;
  source: string;
  payload?: Record<string, unknown>;
}): Promise<{ status: 'failed' | 'cancelled' | 'expired' | 'already_paid' | 'not_found'; orderId?: string; orderNumber?: string }> {
  const query = params.tranId
    ? { transactionId: params.tranId }
    : params.gatewayPaymentId
      ? { gatewayPaymentId: params.gatewayPaymentId }
      : null;
  if (!query) return { status: 'not_found' };

  const tx = await PaymentTransactionModel.findOne(query);
  if (!tx) return { status: 'not_found' };

  if (tx.status === 'paid' || tx.status === 'refunded' || tx.status === 'partially_refunded') {
    return { status: 'already_paid', orderId: String(tx.orderId), orderNumber: tx.orderNumber };
  }

  const now = new Date();
  const prevStatus = tx.status;
  tx.status = params.outcome;
  tx.processingLockAt = null;
  tx.failureReason = params.reason;
  if (params.outcome === 'cancelled') tx.cancelledAt = now;
  else tx.failedAt = now;
  if (params.payload) {
    tx.rawPayload = redactGatewayPayload(params.payload);
  }
  tx.webhookEvents = tx.webhookEvents || [];
  tx.webhookEvents.push({
    eventId: `evt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    source: params.source,
    status: params.outcome,
    receivedAt: now,
    verified: true,
    error: params.reason,
  });
  await tx.save();

  const order = await OrderModel.findById(tx.orderId);
  if (order) {
    if (order.paymentStatus !== 'paid' && order.orderStatus === 'pending') {
      order.paymentStatus = params.outcome;
      order.orderStatus = 'cancelled';
      order.fulfillmentStatus = 'cancelled';
      order.cancellationReason = params.reason;
      if (['initiated', 'pending', 'authorized'].includes(prevStatus)) {
        await releaseOrderReservationSafe(order, params.reason);
      }
      order.statusHistory.push({
        fromStatus: 'pending',
        toStatus: 'cancelled',
        actorName: 'Payment Gateway',
        reason: params.reason,
        timestamp: now,
      });
      await order.save();
    } else if (order.paymentStatus !== 'paid') {
      order.paymentStatus = params.outcome;
      await order.save();
    }

    await writePaymentSystemLog('warn', `Payment ${params.outcome} for order ${order.orderNumber}`, {
      orderNumber: order.orderNumber,
      transactionId: tx.transactionId,
      provider: tx.provider,
      reason: params.reason,
    });

    return { status: params.outcome, orderId: String(order._id), orderNumber: order.orderNumber };
  }

  return { status: params.outcome };
}

export async function reReserveOrderStockOrThrow(order: IOrder) {
  const reReserved: Array<{ productId: string; variantId?: string | null; quantity: number; sku: string; name: string }> = [];
  try {
    for (const item of order.items) {
      const prod = await ProductModel.findOne({ _id: item.productId, status: 'published' });
      if (!prod) {
        throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${item.name} is no longer available for purchase.`);
      }
      const skipLock = prod.manageInventory === false || Boolean(prod.allowBackorder);
      if (item.variantId) {
        if (!skipLock) {
          const v = prod.variants.find(
            (x: { _id: unknown; isActive?: boolean }) => String(x._id) === item.variantId && x.isActive !== false,
          );
          if (!v) throw new AppError(409, 'VARIANT_NOT_FOUND', `${item.name} variant is unavailable.`);
          const maxAllowed = v.stockOnHand - item.quantity;
          const resProd = await ProductModel.findOneAndUpdate(
            {
              _id: prod._id,
              variants: { $elemMatch: { _id: item.variantId, isActive: true, reservedStock: { $lte: maxAllowed } } },
            },
            { $inc: { 'variants.$.reservedStock': item.quantity } },
          );
          if (!resProd) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${item.name} to confirm order.`);
        } else if (prod.manageInventory !== false) {
          await ProductModel.updateOne(
            { _id: prod._id, 'variants._id': item.variantId },
            { $inc: { 'variants.$.reservedStock': item.quantity } },
          );
        }
      } else if (!skipLock) {
        const resProd = await ProductModel.findOneAndUpdate(
          {
            _id: prod._id,
            status: 'published',
            $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reservedStock'] }, item.quantity] },
          },
          { $inc: { reservedStock: item.quantity } },
        );
        if (!resProd) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${item.name} to confirm order.`);
      } else if (prod.manageInventory !== false) {
        await ProductModel.updateOne({ _id: prod._id }, { $inc: { reservedStock: item.quantity } });
      }

      if (prod.manageInventory !== false) {
        reReserved.push({
          productId: String(item.productId),
          variantId: item.variantId || null,
          quantity: item.quantity,
          sku: item.sku,
          name: item.name,
        });
      }
    }
  } catch (err) {
    for (const r of reReserved) {
      if (r.variantId) {
        await ProductModel.updateOne(
          { _id: r.productId, 'variants._id': r.variantId },
          { $inc: { 'variants.$.reservedStock': -r.quantity } },
        ).catch(() => undefined);
      } else {
        await ProductModel.updateOne({ _id: r.productId }, { $inc: { reservedStock: -r.quantity } }).catch(() => undefined);
      }
    }
    throw err;
  }
}

export async function verifyAndFinalizePayment(params: {
  provider: PaymentProvider;
  tranId?: string;
  valId?: string;
  paymentId?: string;
  paymentRefId?: string;
  callbackStatus?: string;
  source: 'callback' | 'webhook' | 'ipn' | 'reconcile' | 'poll';
  payload?: Record<string, unknown>;
}): Promise<{
  status: 'paid' | 'already_paid' | 'pending' | 'failed' | 'cancelled' | 'not_found';
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  reason?: string;
}> {
  const lookup = params.tranId
    ? { transactionId: params.tranId }
    : params.paymentId || params.paymentRefId
      ? { gatewayPaymentId: params.paymentId || params.paymentRefId }
      : null;

  if (!lookup) return { status: 'not_found' };

  const tx = await PaymentTransactionModel.findOne(lookup);
  if (!tx) return { status: 'not_found' };

  if (tx.status === 'paid' || tx.status === 'refunded' || tx.status === 'partially_refunded') {
    return {
      status: 'already_paid',
      orderId: String(tx.orderId),
      orderNumber: tx.orderNumber,
      transactionId: tx.transactionId,
    };
  }

  const order = await OrderModel.findById(tx.orderId);
  if (!order) return { status: 'not_found' };

  // Only fast-path customer cancellation/failure from genuine browser callbacks matching the gateway session ref.
  // Server webhooks/IPNs without verification must query the gateway rather than trusting arbitrary status fields.
  const normalizedCallback = String(params.callbackStatus || '').toLowerCase();
  const hasMatchingGatewayRef =
    !tx.gatewayPaymentId ||
    (params.paymentId && params.paymentId === tx.gatewayPaymentId) ||
    (params.paymentRefId && params.paymentRefId === tx.gatewayPaymentId);
  const allowCallbackFastFail = params.source === 'callback' && Boolean(hasMatchingGatewayRef);

  if (allowCallbackFastFail && (normalizedCallback === 'cancel' || normalizedCallback === 'cancelled')) {
    const cancelRes = await markPaymentFailedOrCancelled({
      tranId: tx.transactionId,
      outcome: 'cancelled',
      reason: `${tx.provider.toUpperCase()} payment cancelled by customer.`,
      source: params.source,
      payload: params.payload,
    });
    return { ...cancelRes, status: 'cancelled', transactionId: tx.transactionId };
  }
  if (allowCallbackFastFail && (normalizedCallback === 'failure' || normalizedCallback === 'failed')) {
    const failRes = await markPaymentFailedOrCancelled({
      tranId: tx.transactionId,
      outcome: 'failed',
      reason: `${tx.provider.toUpperCase()} payment failed at gateway.`,
      source: params.source,
      payload: params.payload,
    });
    return { ...failRes, status: 'failed', transactionId: tx.transactionId };
  }

  // Atomic concurrency lease lock to avoid race between simultaneous IPN, webhook & browser redirect
  const lockNow = new Date();
  const lockExpiryCutoff = new Date(lockNow.getTime() - 30_000);
  const lockDoc = await PaymentTransactionModel.findOneAndUpdate(
    {
      _id: tx._id,
      status: { $in: ['initiated', 'pending', 'authorized', 'expired'] },
      $or: [
        { processingLockAt: null },
        { processingLockAt: { $exists: false } },
        { processingLockAt: { $lt: lockExpiryCutoff } },
      ],
    },
    { $set: { status: 'pending', processingLockAt: lockNow } },
    { new: true },
  );
  if (!lockDoc) {
    const latest = await PaymentTransactionModel.findById(tx._id).lean();
    if (latest?.status === 'paid' || latest?.status === 'refunded' || latest?.status === 'partially_refunded') {
      return {
        status: 'already_paid',
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
        transactionId: tx.transactionId,
      };
    }
    if (latest?.status === 'cancelled') {
      return {
        status: 'cancelled',
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
        transactionId: tx.transactionId,
      };
    }
    if (latest?.status === 'pending' || latest?.status === 'initiated' || latest?.status === 'authorized') {
      return {
        status: 'pending',
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
        transactionId: tx.transactionId,
      };
    }
    return {
      status: 'failed',
      orderId: String(tx.orderId),
      orderNumber: tx.orderNumber,
      transactionId: tx.transactionId,
    };
  }

  const expectedAmount = Number(tx.requestedAmount || tx.amount);
  let verification: GatewayVerifyOutput;

  try {
    if (tx.provider === 'bkash') {
      const paymentID = params.paymentId || tx.gatewayPaymentId || String(params.payload?.paymentID || '');
      if (params.source === 'callback') {
        verification = await executeAndVerifyBkashPayment({
          transactionId: tx.transactionId,
          expectedAmount,
          expectedCurrency: tx.currency || 'BDT',
          gatewayPaymentId: paymentID,
          payload: params.payload,
        });
      } else {
        verification = await queryBkashPaymentStatus({
          transactionId: tx.transactionId,
          expectedAmount,
          expectedCurrency: tx.currency || 'BDT',
          gatewayPaymentId: paymentID,
          payload: params.payload,
        });
        if (!verification.verified && verification.status === 'authorized') {
          verification = await executeAndVerifyBkashPayment({
            transactionId: tx.transactionId,
            expectedAmount,
            expectedCurrency: tx.currency || 'BDT',
            gatewayPaymentId: paymentID,
            payload: params.payload,
          });
        }
      }
    } else if (tx.provider === 'nagad') {
      verification = await verifyNagadPayment({
        transactionId: tx.transactionId,
        expectedAmount,
        expectedCurrency: tx.currency || 'BDT',
        paymentRefId: params.paymentRefId || tx.gatewayPaymentId,
        payload: params.payload,
      });
    } else {
      const valId = params.valId || String(params.payload?.val_id || '');
      verification = valId
        ? await verifySslCommerzPayment({
            transactionId: tx.transactionId,
            expectedAmount,
            expectedCurrency: tx.currency || 'BDT',
            gatewayValidationId: valId,
            payload: params.payload,
          })
        : await querySslCommerzByTranId(tx.transactionId, expectedAmount, tx.currency || 'BDT');
    }
  } catch (err) {
    verification = {
      verified: false,
      status: params.source === 'reconcile' || params.source === 'poll' ? 'pending' : 'failed',
      failureReason: err instanceof Error ? err.message : 'Gateway verification error.',
      raw: params.payload ? redactGatewayPayload(params.payload) : undefined,
    };
  }

  const now = new Date();
  const evtId = `evt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

  if (!verification.verified) {
    if (verification.status === 'pending' || verification.status === 'authorized') {
      lockDoc.status = verification.status;
      lockDoc.processingLockAt = null;
      lockDoc.failureReason = verification.failureReason;
      lockDoc.webhookEvents.push({
        eventId: evtId,
        source: params.source,
        status: verification.status,
        receivedAt: now,
        verified: false,
        error: verification.failureReason,
      });
      await lockDoc.save();
      return {
        status: 'pending',
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        transactionId: tx.transactionId,
        reason: verification.failureReason,
      };
    }

    const finalOutcome = verification.status === 'cancelled' ? 'cancelled' : 'failed';
    const failRes = await markPaymentFailedOrCancelled({
      tranId: tx.transactionId,
      outcome: finalOutcome,
      reason: verification.failureReason || 'Gateway verification failed or amount mismatch.',
      source: params.source,
      payload: verification.raw || params.payload,
    });
    return {
      ...failRes,
      status: finalOutcome,
      transactionId: tx.transactionId,
      reason: verification.failureReason,
    };
  }

  // Anti-replay check: ensure gatewayTransactionId or gatewayValidationId is not already claimed by another paid tx
  const dupOrFilters: Array<Record<string, unknown>> = [];
  if (verification.gatewayTransactionId) {
    dupOrFilters.push({ gatewayTransactionId: verification.gatewayTransactionId });
  }
  if (verification.gatewayValidationId) {
    dupOrFilters.push({ gatewayValidationId: verification.gatewayValidationId });
  }
  if (dupOrFilters.length > 0) {
    const duplicateClaim = await PaymentTransactionModel.findOne({
      _id: { $ne: lockDoc._id },
      status: { $in: ['paid', 'refund_pending', 'partially_refunded', 'refunded'] },
      $or: dupOrFilters,
    }).lean();
    if (duplicateClaim) {
      const replayReason = 'Duplicate gateway transaction/validation reference detected (replay blocked).';
      await markPaymentFailedOrCancelled({
        tranId: tx.transactionId,
        outcome: 'failed',
        reason: replayReason,
        source: params.source,
        payload: verification.raw,
      });
      await writePaymentSystemLog('error', replayReason, {
        transactionId: tx.transactionId,
        existingTransactionId: duplicateClaim.transactionId,
      });
      return {
        status: 'failed',
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        transactionId: tx.transactionId,
        reason: replayReason,
      };
    }
  }

  if (!amountsMatch(expectedAmount, verification.verifiedAmount ?? expectedAmount)) {
    const mismatchReason = `Verified amount (${verification.verifiedAmount}) does not match order total (${expectedAmount}).`;
    await markPaymentFailedOrCancelled({
      tranId: tx.transactionId,
      outcome: 'failed',
      reason: mismatchReason,
      source: params.source,
      payload: verification.raw,
    });
    return {
      status: 'failed',
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      transactionId: tx.transactionId,
      reason: mismatchReason,
    };
  }

  // If a delayed verified payment arrives for a previously cancelled/expired order, attempt stock re-reservation
  if (order.orderStatus === 'cancelled') {
    try {
      await reReserveOrderStockOrThrow(order);
    } catch (stockErr) {
      const refundReason =
        stockErr instanceof Error
          ? `Verified delayed payment received after order cancelled, but stock unavailable (${stockErr.message}). Marked refund_pending.`
          : 'Verified delayed payment received after order cancelled and stock exhausted. Marked refund_pending.';
      lockDoc.status = 'refund_pending';
      lockDoc.processingLockAt = null;
      lockDoc.verifiedAmount = verification.verifiedAmount ?? expectedAmount;
      lockDoc.gatewayPaymentId = verification.gatewayPaymentId || lockDoc.gatewayPaymentId;
      lockDoc.gatewayTransactionId = verification.gatewayTransactionId || lockDoc.gatewayTransactionId;
      lockDoc.gatewayValidationId = verification.gatewayValidationId || lockDoc.gatewayValidationId;
      lockDoc.bankTransactionId = verification.bankTransactionId || lockDoc.bankTransactionId;
      lockDoc.verifiedAt = now;
      lockDoc.paidAt = now;
      lockDoc.failureReason = refundReason;
      lockDoc.rawPayload = verification.raw || redactGatewayPayload(params.payload);
      lockDoc.webhookEvents.push({
        eventId: evtId,
        source: params.source,
        status: 'refund_pending',
        receivedAt: now,
        verified: true,
        error: refundReason,
      });
      await lockDoc.save();

      order.paymentStatus = 'refund_pending';
      order.paidAt = now;
      order.staffNotes = order.staffNotes || [];
      order.staffNotes.push({
        note: refundReason,
        actorName: 'Payment Gateway',
        timestamp: now,
      });
      await order.save();

      await writePaymentSystemLog('error', refundReason, {
        orderNumber: order.orderNumber,
        transactionId: tx.transactionId,
        gatewayTransactionId: lockDoc.gatewayTransactionId,
      });

      return {
        status: 'failed',
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        transactionId: tx.transactionId,
        reason: refundReason,
      };
    }
  }

  lockDoc.status = 'paid';
  lockDoc.processingLockAt = null;
  lockDoc.verifiedAmount = verification.verifiedAmount ?? expectedAmount;
  lockDoc.gatewayPaymentId = verification.gatewayPaymentId || lockDoc.gatewayPaymentId;
  lockDoc.gatewayTransactionId = verification.gatewayTransactionId || lockDoc.gatewayTransactionId;
  lockDoc.gatewayValidationId = verification.gatewayValidationId || lockDoc.gatewayValidationId;
  lockDoc.bankTransactionId = verification.bankTransactionId || lockDoc.bankTransactionId;
  lockDoc.verifiedAt = now;
  lockDoc.paidAt = now;
  lockDoc.failureReason = undefined;
  lockDoc.rawPayload = verification.raw || redactGatewayPayload(params.payload);
  lockDoc.webhookEvents.push({
    eventId: evtId,
    source: params.source,
    status: 'paid',
    receivedAt: now,
    verified: true,
  });
  await lockDoc.save();

  order.paymentStatus = 'paid';
  order.paidAt = now;
  if (order.orderStatus === 'pending' || order.orderStatus === 'cancelled') {
    const prevOrderStatus = order.orderStatus;
    order.orderStatus = 'confirmed';
    order.fulfillmentStatus = 'unfulfilled';
    order.cancellationReason = undefined;
    order.statusHistory.push({
      fromStatus: prevOrderStatus,
      toStatus: 'confirmed',
      actorName: 'Payment Gateway',
      reason: `Verified ${tx.provider.toUpperCase()} payment ${lockDoc.gatewayTransactionId || lockDoc.transactionId}`,
      timestamp: now,
    });
  }
  await order.save();

  // Clear purchased items from cart strictly AFTER verified payment
  await clearCartItemsForOrder(order).catch(() => undefined);

  await writePaymentSystemLog('info', `Verified ${tx.provider} payment for order ${order.orderNumber}`, {
    orderNumber: order.orderNumber,
    transactionId: tx.transactionId,
    gatewayTransactionId: lockDoc.gatewayTransactionId,
    verifiedAmount: lockDoc.verifiedAmount,
    source: params.source,
  });

  await sendTransactionalEmail({
    to: order.customerEmail,
    template: 'payment_confirmed',
    subject: `Payment Received for Order ${order.orderNumber}`,
    html: `<p>Your ${tx.provider.toUpperCase()} payment of <strong>৳${order.total.toLocaleString()}</strong> for order <strong>${order.orderNumber}</strong> has been verified.</p><p>Transaction Reference: <strong>${lockDoc.gatewayTransactionId || lockDoc.transactionId}</strong></p>`,
  }).catch(() => undefined);

  return {
    status: 'paid',
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    transactionId: tx.transactionId,
  };
}

export async function retryOrderPaymentForCustomer(params: {
  orderId: string;
  userId: unknown;
  paymentMethod?: PaymentMethod;
  clientIp?: string;
}) {
  if (!mongoose.isValidObjectId(params.orderId)) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  const order = await OrderModel.findOne({ _id: params.orderId, userId: params.userId });
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  const targetMethod = params.paymentMethod || order.paymentMethod;
  if (targetMethod === 'cod') {
    throw new AppError(400, 'INVALID_PAYMENT_METHOD', 'Cannot initiate online gateway session for Cash on Delivery.');
  }

  if (
    !canRetryOrderPayment({
      orderStatus: order.orderStatus,
      paymentMethod: targetMethod,
      paymentStatus: order.paymentStatus,
    })
  ) {
    throw new AppError(
      400,
      'PAYMENT_RETRY_NOT_ELIGIBLE',
      `Order ${order.orderNumber} is not eligible for online payment retry (status: ${order.orderStatus}, payment: ${order.paymentStatus}).`,
    );
  }

  const cmsCfg = await HomepageConfigModel.findOne({ key: 'main' }).lean();
  const pm = cmsCfg?.paymentMethods;
  if (pm) {
    const channelDisabled =
      (targetMethod === 'sslcommerz' && pm.sslcommerzEnabled === false) ||
      (targetMethod === 'bkash' && pm.bkashEnabled === false) ||
      (targetMethod === 'nagad' && pm.nagadEnabled === false) ||
      (targetMethod === 'card' && pm.cardEnabled === false);
    if (channelDisabled) {
      throw new AppError(400, 'PAYMENT_METHOD_DISABLED', 'Selected payment method is currently disabled.');
    }
  }

  if (!isPaymentMethodConfigured(targetMethod)) {
    throw new AppError(503, 'PAYMENT_GATEWAY_UNCONFIGURED', getUnconfiguredMethodMessage(targetMethod));
  }

  // If the order had previously been auto-cancelled by a failed/cancelled attempt, verify & re-reserve stock atomically
  if (order.orderStatus === 'cancelled') {
    await reReserveOrderStockOrThrow(order);
    order.orderStatus = 'pending';
    order.fulfillmentStatus = 'unfulfilled';
    order.cancellationReason = undefined;
    order.statusHistory.push({
      fromStatus: 'cancelled',
      toStatus: 'pending',
      actorName: order.customerName,
      reason: `Customer initiated payment retry (${targetMethod.toUpperCase()})`,
      timestamp: new Date(),
    });
  }

  // Expire any previous unresolved transactions for this order
  await PaymentTransactionModel.updateMany(
    { orderId: order._id, status: { $in: ['initiated', 'pending', 'authorized'] } },
    { $set: { status: 'expired', failureReason: 'Superseded by payment retry' } },
  ).catch(() => undefined);

  order.paymentMethod = targetMethod;
  order.paymentStatus = 'initiated';
  await order.save();

  const { transaction, gatewayUrl } = await createAndInitiatePaymentTransaction({
    order,
    paymentMethod: targetMethod,
    clientIp: params.clientIp,
  });

  return {
    order: { ...order.toObject(), id: String(order._id) },
    transaction,
    gatewayUrl,
  };
}

export async function queryPaymentStatusForUser(params: { transactionId: string; userId: unknown }) {
  const tx = await PaymentTransactionModel.findOne({ transactionId: params.transactionId }).lean();
  if (!tx) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Payment transaction not found.');

  const order = await OrderModel.findOne({ _id: tx.orderId, userId: params.userId }).lean();
  if (!order) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Payment transaction not found.');

  if (['initiated', 'pending', 'authorized'].includes(tx.status) && tx.provider !== 'cod') {
    await verifyAndFinalizePayment({
      provider: tx.provider as PaymentProvider,
      tranId: tx.transactionId,
      paymentId: tx.gatewayPaymentId,
      paymentRefId: tx.gatewayPaymentId,
      source: 'poll',
    }).catch(() => undefined);
  }

  const [freshTx, freshOrder] = await Promise.all([
    PaymentTransactionModel.findById(tx._id).lean(),
    OrderModel.findById(order._id).lean(),
  ]);

  return {
    transaction: freshTx ? serializePaymentTransaction(freshTx as unknown as Record<string, unknown>) : null,
    order: freshOrder ? { ...freshOrder, id: String(freshOrder._id) } : null,
  };
}

export async function reconcilePaymentTransactionAdmin(params: {
  idOrTranId: string;
  actor?: Parameters<typeof recordAuditLog>[0]['actor'];
}) {
  const query = mongoose.isValidObjectId(params.idOrTranId)
    ? { _id: params.idOrTranId }
    : { transactionId: params.idOrTranId };
  const tx = await PaymentTransactionModel.findOne(query);
  if (!tx) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Payment transaction not found.');

  if (tx.provider === 'cod') {
    tx.reconciledAt = new Date();
    tx.reconciliationAttempts = (tx.reconciliationAttempts || 0) + 1;
    await tx.save();
    return { transaction: serializePaymentTransaction(tx.toObject()), outcome: tx.status };
  }

  if (tx.status === 'paid' || tx.status === 'refunded' || tx.status === 'partially_refunded') {
    tx.reconciledAt = new Date();
    tx.reconciliationAttempts = (tx.reconciliationAttempts || 0) + 1;
    await tx.save();
    return { transaction: serializePaymentTransaction(tx.toObject()), outcome: tx.status };
  }

  const verifyResult = await verifyAndFinalizePayment({
    provider: tx.provider as PaymentProvider,
    tranId: tx.transactionId,
    paymentId: tx.gatewayPaymentId,
    paymentRefId: tx.gatewayPaymentId,
    valId: tx.gatewayValidationId,
    source: 'reconcile',
  });

  const updated = await PaymentTransactionModel.findById(tx._id);
  if (updated) {
    // Expire pending transactions past timeout if gateway still reports pending
    if (
      verifyResult.status === 'pending' &&
      updated.expiresAt &&
      updated.expiresAt.getTime() < Date.now()
    ) {
      await markPaymentFailedOrCancelled({
        tranId: updated.transactionId,
        outcome: 'expired',
        reason: 'Payment session expired before gateway confirmation.',
        source: 'reconcile',
      });
    }
    await PaymentTransactionModel.updateOne(
      { _id: updated._id },
      { $set: { reconciledAt: new Date() }, $inc: { reconciliationAttempts: 1 } },
    );
  }

  const finalTx = await PaymentTransactionModel.findById(tx._id).lean();
  if (params.actor) {
    await recordAuditLog({
      actor: params.actor,
      action: 'payment.reconcile',
      resourceType: 'PaymentTransaction',
      resourceId: tx.transactionId,
      summary: `Reconciled ${tx.provider} transaction ${tx.transactionId} (${verifyResult.status})`,
    });
  }

  return {
    transaction: finalTx ? serializePaymentTransaction(finalTx as unknown as Record<string, unknown>) : null,
    outcome: verifyResult.status,
  };
}

export async function reconcilePendingPaymentsAdmin(params: {
  actor?: Parameters<typeof recordAuditLog>[0]['actor'];
  limit?: number;
}) {
  const pending = await PaymentTransactionModel.find({
    status: { $in: ['initiated', 'pending', 'authorized'] },
    provider: { $ne: 'cod' },
  })
    .sort({ createdAt: 1 })
    .limit(Math.min(50, params.limit || 25));

  const results: Array<{ transactionId: string; status: string }> = [];
  for (const tx of pending) {
    try {
      const res = await reconcilePaymentTransactionAdmin({ idOrTranId: String(tx._id), actor: undefined });
      results.push({ transactionId: tx.transactionId, status: res.outcome });
    } catch (err) {
      results.push({
        transactionId: tx.transactionId,
        status: err instanceof Error ? err.message : 'error',
      });
    }
  }

  if (params.actor) {
    await recordAuditLog({
      actor: params.actor,
      action: 'payment.reconcile_batch',
      resourceType: 'PaymentTransaction',
      summary: `Batch-reconciled ${results.length} pending online transactions`,
      metadata: { results },
    });
  }

  return { count: results.length, results };
}

export async function refundPaymentTransactionAdmin(params: {
  idOrTranId: string;
  amount?: number;
  reason: string;
  actor: NonNullable<Parameters<typeof recordAuditLog>[0]['actor']>;
}) {
  const query = mongoose.isValidObjectId(params.idOrTranId)
    ? { _id: params.idOrTranId }
    : { transactionId: params.idOrTranId };
  const tx = await PaymentTransactionModel.findOne(query);
  if (!tx) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Payment transaction not found.');

  if (!canRefundPaymentTransaction({ status: tx.status, amount: tx.amount, refundedAmount: tx.refundedAmount })) {
    throw new AppError(
      400,
      'REFUND_NOT_ELIGIBLE',
      `Transaction ${tx.transactionId} in status "${tx.status}" has no refundable balance remaining.`,
    );
  }

  const refundableBalance = computeRefundableBalance(tx.amount, tx.refundedAmount || 0);
  const refundAmount = params.amount ? Number(params.amount.toFixed(2)) : refundableBalance;
  if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > refundableBalance) {
    throw new AppError(
      400,
      'INVALID_REFUND_AMOUNT',
      `Refund amount must be between ৳1 and refundable balance ৳${refundableBalance.toLocaleString('en-IN')}.`,
    );
  }

  // Prevent duplicate simultaneous refund clicks by checking for pending refund entries
  const hasPendingRefund = (tx.refunds || []).some((r: { status: string }) => r.status === 'pending');
  if (hasPendingRefund) {
    throw new AppError(409, 'REFUND_IN_PROGRESS', 'A refund request is already in progress for this transaction.');
  }

  const refundId = `RFD-${tx.orderNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date();
  let gatewayRefundId: string | undefined;
  let gatewayRespRaw: Record<string, unknown> | undefined;

  if (tx.provider === 'cod') {
    gatewayRefundId = `COD-${refundId}`;
  } else if (tx.provider === 'bkash') {
    const out = await refundBkashPayment({
      transactionId: tx.transactionId,
      gatewayPaymentId: tx.gatewayPaymentId,
      gatewayTransactionId: tx.gatewayTransactionId || tx.bankTransactionId,
      amount: refundAmount,
      reason: params.reason,
      sku: tx.orderNumber,
    });
    if (!out.success) {
      tx.refunds.push({
        refundId,
        amount: refundAmount,
        reason: params.reason,
        status: 'failed',
        requestedBy: params.actor._id as mongoose.Types.ObjectId,
        requestedByName: params.actor.name,
        gatewayResponse: out.raw,
        createdAt: now,
      });
      await tx.save();
      throw new AppError(502, 'GATEWAY_REFUND_FAILED', out.failureReason || 'bKash refund failed.');
    }
    gatewayRefundId = out.gatewayRefundId;
    gatewayRespRaw = out.raw;
  } else if (tx.provider === 'sslcommerz') {
    const out = await refundSslCommerzPayment({
      transactionId: tx.transactionId,
      bankTransactionId: tx.bankTransactionId || tx.gatewayTransactionId,
      gatewayTransactionId: tx.gatewayTransactionId,
      amount: refundAmount,
      reason: params.reason,
    });
    if (!out.success) {
      tx.refunds.push({
        refundId,
        amount: refundAmount,
        reason: params.reason,
        status: 'failed',
        requestedBy: params.actor._id as mongoose.Types.ObjectId,
        requestedByName: params.actor.name,
        gatewayResponse: out.raw,
        createdAt: now,
      });
      await tx.save();
      throw new AppError(502, 'GATEWAY_REFUND_FAILED', out.failureReason || 'SSLCommerz refund failed.');
    }
    gatewayRefundId = out.gatewayRefundId;
    gatewayRespRaw = out.raw;
  } else if (tx.provider === 'nagad') {
    throw new AppError(
      422,
      'GATEWAY_REFUND_UNSUPPORTED',
      'Direct Nagad REST API refunds are not enabled on the standard Nagad PG v0.2.0 API. Process the refund via Nagad Merchant Portal and record settlement.',
    );
  }

  const nextRefundedTotal = Number(((tx.refundedAmount || 0) + refundAmount).toFixed(2));
  const fullyRefunded = nextRefundedTotal >= tx.amount - 0.01;
  const nextStatus: PaymentTransactionStatus = fullyRefunded ? 'refunded' : 'partially_refunded';

  tx.refundedAmount = nextRefundedTotal;
  tx.status = nextStatus;
  tx.refunds.push({
    refundId,
    gatewayRefundId,
    amount: refundAmount,
    reason: params.reason,
    status: 'completed',
    requestedBy: params.actor._id as mongoose.Types.ObjectId,
    requestedByName: params.actor.name,
    gatewayResponse: gatewayRespRaw,
    createdAt: now,
    completedAt: now,
  });
  await tx.save();

  const order = await OrderModel.findById(tx.orderId);
  if (order) {
    order.paymentStatus = nextStatus;
    order.staffNotes.push({
      note: `Refund of ৳${refundAmount.toLocaleString('en-IN')} (${refundId}) processed via ${tx.provider.toUpperCase()}. Reason: ${params.reason}`,
      actorName: params.actor.name,
      timestamp: now,
    });
    await order.save();

    await sendTransactionalEmail({
      to: order.customerEmail,
      template: 'payment_refunded',
      subject: `Refund Processed for Order ${order.orderNumber}`,
      html: `<p>A refund of <strong>৳${refundAmount.toLocaleString()}</strong> for order <strong>${order.orderNumber}</strong> has been processed.</p><p>Refund Reference: <strong>${gatewayRefundId || refundId}</strong></p>`,
    }).catch(() => undefined);
  }

  await writePaymentSystemLog('info', `Refund ${refundId} (৳${refundAmount}) completed for ${tx.transactionId}`, {
    transactionId: tx.transactionId,
    orderNumber: tx.orderNumber,
    provider: tx.provider,
    refundAmount,
    gatewayRefundId,
  });

  await recordAuditLog({
    actor: params.actor,
    action: 'payment.refund',
    resourceType: 'PaymentTransaction',
    resourceId: tx.transactionId,
    summary: `Refunded ৳${refundAmount.toLocaleString('en-IN')} on ${tx.orderNumber} (${tx.provider})`,
    metadata: { refundId, gatewayRefundId, reason: params.reason },
  });

  return {
    transaction: serializePaymentTransaction(tx.toObject()),
    refundId,
    gatewayRefundId,
    refundedAmount: refundAmount,
    status: nextStatus,
  };
}
