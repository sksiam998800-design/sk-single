import mongoose from 'mongoose';
import { OrderModel, PaymentTransactionModel, serializePaymentTransaction } from './order.model';
import { ProductModel } from '../products/product.model';
import { InventoryMovementModel } from '../inventory/inventoryMovement.model';
import { ReturnRequestModel } from '../reviews/review.model';
import { HomepageConfigModel } from '../cms/cms.model';
import { AppError } from '../../middleware/error.middleware';
import { sendTransactionalEmail } from '../../services/email.service';
import { refundPaymentTransactionAdmin } from '../../services/payment.service';
import type { recordAuditLog } from '../../middleware/auth.middleware';
import {
  canTransitionOrderStatus,
  shouldRestoreStockOnCancel,
  type OrderStatus,
  type PaymentStatus,
} from '../../../../src/lib/orderStateMachine';

export async function getOrderStatsAdmin() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [statusCounts, paymentCounts, salesAgg, newTodayCount, pendingCancellationRequests] = await Promise.all([
    OrderModel.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    OrderModel.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
    OrderModel.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, totalSales: { $sum: '$total' } } },
    ]),
    OrderModel.countDocuments({ createdAt: { $gte: startOfToday } }),
    OrderModel.countDocuments({ 'cancellationRequest.status': 'pending' }),
  ]);

  const byOrderStatus: Record<string, number> = {};
  let totalOrders = 0;
  for (const row of statusCounts) {
    byOrderStatus[String(row._id)] = Number(row.count || 0);
    totalOrders += Number(row.count || 0);
  }

  const byPaymentStatus: Record<string, number> = {};
  for (const row of paymentCounts) {
    byPaymentStatus[String(row._id)] = Number(row.count || 0);
  }

  return {
    totalOrders,
    newTodayCount,
    pending: byOrderStatus.pending || 0,
    confirmed: byOrderStatus.confirmed || 0,
    processing: byOrderStatus.processing || 0,
    packed: byOrderStatus.packed || 0,
    shipped: byOrderStatus.shipped || 0,
    delivered: byOrderStatus.delivered || 0,
    cancelled: byOrderStatus.cancelled || 0,
    return_requested: byOrderStatus.return_requested || 0,
    returned: byOrderStatus.returned || 0,
    pendingCancellationRequests,
    totalSales: Number(salesAgg[0]?.totalSales || 0),
    paidOrders: byPaymentStatus.paid || 0,
    pendingPayments:
      (byPaymentStatus.initiated || 0) +
      (byPaymentStatus.pending || 0) +
      (byPaymentStatus.authorized || 0) +
      (byPaymentStatus.unpaid || 0),
    unpaidOrders: byPaymentStatus.unpaid || 0,
  };
}

export async function listOrdersAdmin(params: {
  page: number;
  limit: number;
  q: string;
  status: string;
  statusGroup: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const { page, limit, q, status, statusGroup, paymentStatus, fulfillmentStatus, dateFrom, dateTo, sortBy, sortOrder } =
    params;
  const filter: Record<string, unknown> = {};
  if (status) {
    filter.orderStatus = status;
  } else if (statusGroup) {
    const groupMap: Record<string, string[]> = {
      pending: ['pending', 'confirmed'],
      processing: ['processing', 'packed'],
      shipped: ['shipped'],
      delivered: ['delivered'],
      cancelled: ['cancelled', 'returned', 'return_requested'],
    };
    if (groupMap[statusGroup]) {
      filter.orderStatus = { $in: groupMap[statusGroup] };
    }
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (fulfillmentStatus) {
    filter.fulfillmentStatus = fulfillmentStatus;
  }
  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!Number.isNaN(d.getTime())) createdAtFilter.$gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = d;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      filter.createdAt = createdAtFilter;
    }
  }
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: regex },
      { customerName: regex },
      { customerEmail: regex },
      { customerPhone: regex },
      { 'shippingAddress.district': regex },
      { 'shippingAddress.division': regex },
    ];
  }

  const sortField = sortBy === 'total' ? 'total' : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [total, orders] = await Promise.all([
    OrderModel.countDocuments(filter),
    OrderModel.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    orders: orders.map((o) => ({ ...o, id: String(o._id) })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getOrderDetailAdmin(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const order = await OrderModel.findById(id).lean();
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const [transactions, storeConfig] = await Promise.all([
    PaymentTransactionModel.find({ orderId: order._id }).lean(),
    HomepageConfigModel.findOne({ key: 'main' }).select('storeInfo contactInfo').lean(),
  ]);
  return {
    order: { ...order, id: String(order._id) },
    transactions: transactions.map((t) => serializePaymentTransaction(t as unknown as Record<string, unknown>)),
    storeInfo: storeConfig?.storeInfo || null,
    contactInfo: storeConfig?.contactInfo || null,
  };
}

export async function transitionOrderStatusAdmin(params: {
  id: string;
  nextStatus: 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  reason?: string;
  courierName?: string;
  trackingNumber?: string;
  actorId: unknown;
  actorName: string;
}) {
  if (!mongoose.isValidObjectId(params.id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const order = await OrderModel.findById(params.id);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

  const check = canTransitionOrderStatus({
    currentStatus: order.orderStatus,
    nextStatus: params.nextStatus as OrderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  });
  if (!check.allowed) {
    throw new AppError(400, 'ILLEGAL_TRANSITION', check.reason || 'Transition not allowed.');
  }

  const prevStatus = order.orderStatus;

  if (params.nextStatus === 'shipped' && prevStatus !== 'shipped') {
    for (const item of order.items) {
      const prodMeta = await ProductModel.findById(item.productId).select('manageInventory').lean().catch(() => null);
      const tracksStock = !prodMeta || prodMeta.manageInventory !== false;

      if (item.variantId) {
        await ProductModel.updateOne(
          { _id: item.productId, 'variants._id': item.variantId },
          {
            $inc: tracksStock
              ? {
                  'variants.$.stockOnHand': -item.quantity,
                  'variants.$.reservedStock': -item.quantity,
                  soldCount: item.quantity,
                }
              : { soldCount: item.quantity },
          },
        );
      } else {
        await ProductModel.updateOne(
          { _id: item.productId },
          {
            $inc: tracksStock
              ? {
                  stockOnHand: -item.quantity,
                  reservedStock: -item.quantity,
                  soldCount: item.quantity,
                }
              : { soldCount: item.quantity },
          },
        );
      }
      if (tracksStock) {
        await InventoryMovementModel.create({
          productId: item.productId,
          variantId: item.variantId || null,
          sku: item.sku,
          productName: item.name,
          type: 'sale',
          delta: -item.quantity,
          previousStockOnHand: 0,
          newStockOnHand: 0,
          previousReserved: item.quantity,
          newReserved: 0,
          reason: `Shipped order ${order.orderNumber}`,
          referenceId: order.orderNumber,
          actorId: params.actorId,
          actorName: params.actorName,
        }).catch(() => undefined);
      }
    }
    order.fulfillmentStatus = 'shipped';
    if (params.courierName) order.courierName = params.courierName;
    if (params.trackingNumber) order.trackingNumber = params.trackingNumber;
  }

  if (params.nextStatus === 'packed') order.fulfillmentStatus = 'packing';
  if (params.nextStatus === 'delivered') {
    order.fulfillmentStatus = 'delivered';
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid') {
      order.paymentStatus = 'paid';
    }
  }

  if (params.nextStatus === 'cancelled') {
    const prevPaymentStatus = order.paymentStatus;
    if (shouldRestoreStockOnCancel(prevStatus, prevPaymentStatus)) {
      for (const item of order.items) {
        const prodMeta = await ProductModel.findById(item.productId).select('manageInventory').lean().catch(() => null);
        const tracksStock = !prodMeta || prodMeta.manageInventory !== false;
        if (!tracksStock) continue;

        if (item.variantId) {
          await ProductModel.updateOne(
            { _id: item.productId, 'variants._id': item.variantId },
            { $inc: { 'variants.$.reservedStock': -item.quantity } },
          );
        } else {
          await ProductModel.updateOne({ _id: item.productId }, { $inc: { reservedStock: -item.quantity } });
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
          reason: params.reason || `Cancelled by staff (${order.orderNumber})`,
          referenceId: order.orderNumber,
          actorId: params.actorId,
          actorName: params.actorName,
        }).catch(() => undefined);
      }
    }
    order.fulfillmentStatus = 'cancelled';
    order.cancellationReason = params.reason || 'Cancelled by operations team';
    if (prevPaymentStatus === 'paid') {
      order.paymentStatus = 'refund_pending';
      await PaymentTransactionModel.updateMany(
        { orderId: order._id, status: 'paid' },
        { $set: { status: 'refund_pending' } },
      ).catch(() => undefined);
    } else if (prevPaymentStatus === 'pending') {
      order.paymentStatus = 'cancelled';
    }
    if (order.cancellationRequest && order.cancellationRequest.status === 'pending') {
      const now = new Date();
      order.cancellationRequest.status = 'approved';
      order.cancellationRequest.reviewedBy = params.actorId as typeof order.cancellationRequest.reviewedBy;
      order.cancellationRequest.reviewedByName = params.actorName;
      order.cancellationRequest.reviewedAt = now;
      order.cancellationRequest.adminNotes = params.reason || 'Approved via direct order cancellation';
      if (!Array.isArray(order.cancellationHistory)) order.cancellationHistory = [];
      order.cancellationHistory.push({
        action: 'approved',
        actorId: params.actorId as typeof order.cancellationHistory[0]['actorId'],
        actorName: params.actorName,
        reason: order.cancellationRequest.reason,
        adminNotes: params.reason || 'Approved via direct order cancellation',
        timestamp: now,
      });
    }
  }

  order.orderStatus = params.nextStatus;
  order.statusHistory.push({
    fromStatus: prevStatus,
    toStatus: params.nextStatus,
    actorId: params.actorId as typeof order.statusHistory[0]['actorId'],
    actorName: params.actorName,
    reason: params.reason,
    timestamp: new Date(),
  });
  await order.save();

  return {
    order: { ...order.toObject(), id: String(order._id) },
    prevStatus,
    orderNumber: order.orderNumber,
  };
}

export async function updateOrderPaymentStatusAdmin(params: {
  id: string;
  paymentStatus: PaymentStatus;
  note?: string;
  actorName: string;
}) {
  if (!mongoose.isValidObjectId(params.id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const order = await OrderModel.findById(params.id);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

  if (order.paymentMethod !== 'cod' && params.paymentStatus === 'paid') {
    const verifiedTx = await PaymentTransactionModel.findOne({ orderId: order._id, status: 'paid' }).lean();
    if (!verifiedTx) {
      throw new AppError(
        400,
        'ONLINE_PAYMENT_UNVERIFIED',
        'Online payments cannot be manually marked as Paid without a verified gateway transaction.',
      );
    }
  }

  const prevPaymentStatus = order.paymentStatus;
  if (
    (params.paymentStatus === 'refund_pending' ||
      params.paymentStatus === 'partially_refunded' ||
      params.paymentStatus === 'refunded') &&
    prevPaymentStatus !== 'paid' &&
    prevPaymentStatus !== 'refund_pending' &&
    prevPaymentStatus !== 'partially_refunded' &&
    prevPaymentStatus !== 'refunded'
  ) {
    throw new AppError(
      400,
      'REFUND_NOT_ELIGIBLE',
      `Cannot mark order payment as "${params.paymentStatus}" when current status is "${prevPaymentStatus}".`,
    );
  }

  let nagadPortalSettlementHandled = false;
  if (
    order.paymentMethod !== 'cod' &&
    (params.paymentStatus === 'refunded' || params.paymentStatus === 'partially_refunded')
  ) {
    const completedGatewayRefundTx = await PaymentTransactionModel.findOne({
      orderId: order._id,
      status: params.paymentStatus,
    })
      .lean()
      .catch(() => null);

    if (!completedGatewayRefundTx) {
      if (order.paymentMethod === 'nagad') {
        const portalRef = params.note?.trim() || '';
        if (portalRef.length < 5) {
          throw new AppError(
            400,
            'NAGAD_PORTAL_REFERENCE_REQUIRED',
            'Nagad PG v0.2.0 requires processing refunds in the Nagad Merchant Portal. Provide the portal refund reference in the Payment Note.',
          );
        }
        const nagadTx = await PaymentTransactionModel.findOne({
          orderId: order._id,
          provider: 'nagad',
          status: { $in: ['paid', 'refund_pending', 'partially_refunded'] },
        }).catch(() => null);
        if (nagadTx) {
          const now = new Date();
          nagadTx.status = params.paymentStatus;
          if (params.paymentStatus === 'refunded') {
            nagadTx.refundedAmount = nagadTx.amount;
          }
          nagadTx.refunds = nagadTx.refunds || [];
          nagadTx.refunds.push({
            refundId: `RFD-NGD-${Date.now().toString(36).toUpperCase()}`,
            gatewayRefundId: `NAGAD-PORTAL`,
            amount: params.paymentStatus === 'refunded' ? nagadTx.amount - (nagadTx.refundedAmount || 0) : nagadTx.amount,
            reason: portalRef,
            status: 'completed',
            requestedByName: params.actorName,
            createdAt: now,
            completedAt: now,
          });
          await nagadTx.save();
          nagadPortalSettlementHandled = true;
        }
      } else {
        throw new AppError(
          400,
          'GATEWAY_REFUND_REQUIRED',
          'Online gateway refunds must be executed through the gateway refund API in Payments Console.',
        );
      }
    }
  }

  order.paymentStatus = params.paymentStatus;
  order.staffNotes.push({
    note: params.note?.trim() || `Payment status updated from ${prevPaymentStatus} to ${params.paymentStatus}`,
    actorName: params.actorName,
    timestamp: new Date(),
  });
  await order.save();

  if (params.paymentStatus === 'refund_pending') {
    await PaymentTransactionModel.updateMany(
      { orderId: order._id, status: 'paid' },
      { $set: { status: 'refund_pending' } },
    ).catch(() => undefined);
  } else if (params.paymentStatus === 'refunded' && order.paymentMethod === 'cod' && !nagadPortalSettlementHandled) {
    await PaymentTransactionModel.updateMany(
      { orderId: order._id, provider: 'cod', status: { $in: ['paid', 'refund_pending'] } },
      { $set: { status: 'refunded', refundedAmount: order.total } },
    ).catch(() => undefined);
  }

  return {
    order: { ...order.toObject(), id: String(order._id) },
    prevPaymentStatus,
    orderNumber: order.orderNumber,
  };
}

export async function addOrderNoteAdmin(id: string, note: string, actorName: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const order = await OrderModel.findById(id);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  order.staffNotes.push({ note, actorName, timestamp: new Date() });
  await order.save();
  return { ...order.toObject(), id: String(order._id) };
}

export async function listReturnsAdmin() {
  const returns = await ReturnRequestModel.find().sort({ createdAt: -1 }).lean();
  return returns.map((r) => ({ ...r, id: String(r._id) }));
}

const RETURN_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected', 'received'],
  approved: ['received', 'rejected', 'refunded'],
  received: ['refunded', 'rejected'],
  rejected: [],
  refunded: [],
};

export async function updateReturnAdmin(params: {
  id: string;
  status: 'approved' | 'rejected' | 'received' | 'refunded';
  inspectionNotes?: string;
  restockEligible: boolean;
  actorId: unknown;
  actorName: string;
}) {
  if (!mongoose.isValidObjectId(params.id)) {
    throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request not found.');
  }
  const ret = await ReturnRequestModel.findById(params.id);
  if (!ret) throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request not found.');

  const allowedNext = RETURN_TRANSITIONS[ret.status] || [];
  if (!allowedNext.includes(params.status)) {
    throw new AppError(
      400,
      'INVALID_RETURN_TRANSITION',
      `Cannot transition return claim from "${ret.status}" to "${params.status}".`,
    );
  }

  ret.status = params.status;
  if (params.inspectionNotes) ret.inspectionNotes = params.inspectionNotes;
  ret.handledBy = params.actorId as typeof ret.handledBy;

  if ((params.status === 'received' || params.status === 'refunded') && params.restockEligible && !ret.restocked) {
    let anyRestocked = false;
    for (const item of ret.items) {
      const prodMeta = await ProductModel.findById(item.productId).select('manageInventory').lean().catch(() => null);
      if (prodMeta && prodMeta.manageInventory === false) continue;

      const variantRestock = await ProductModel.updateOne(
        { _id: item.productId, 'variants.sku': item.sku },
        { $inc: { 'variants.$.stockOnHand': item.quantity } },
      );
      if (!variantRestock.matchedCount) {
        await ProductModel.updateOne({ _id: item.productId }, { $inc: { stockOnHand: item.quantity } });
      }
      await InventoryMovementModel.create({
        productId: item.productId,
        sku: item.sku,
        productName: item.name,
        type: 'return',
        delta: item.quantity,
        previousStockOnHand: 0,
        newStockOnHand: 0,
        previousReserved: 0,
        newReserved: 0,
        reason: `Restocked after return inspection (${ret.orderNumber})`,
        referenceId: ret.orderNumber,
        actorId: params.actorId,
        actorName: params.actorName,
      }).catch(() => undefined);
      anyRestocked = true;
    }
    if (anyRestocked) {
      ret.restocked = true;
    }
  }

  if (params.status === 'rejected') {
    await OrderModel.updateOne(
      { _id: ret.orderId, orderStatus: 'return_requested' },
      {
        $set: { orderStatus: 'delivered' },
        $push: {
          statusHistory: {
            fromStatus: 'return_requested',
            toStatus: 'delivered',
            actorId: params.actorId,
            actorName: params.actorName,
            reason: params.inspectionNotes || 'Return request declined',
            timestamp: new Date(),
          },
        },
      },
    ).catch(() => undefined);
  }

  if (params.status === 'refunded') {
    let gatewayRefundHandled = false;
    if (typeof PaymentTransactionModel.findOne === 'function') {
      const paidOnlineTx = await PaymentTransactionModel.findOne({
        orderId: ret.orderId,
        provider: { $ne: 'cod' },
        status: { $in: ['paid', 'refund_pending', 'partially_refunded'] },
      })
        .sort({ createdAt: -1 })
        .catch(() => null);

      if (paidOnlineTx) {
        await refundPaymentTransactionAdmin({
          idOrTranId: String(paidOnlineTx._id),
          amount: Number(ret.refundAmount || paidOnlineTx.amount),
          reason: params.inspectionNotes || `Return approved & refunded (${ret.orderNumber})`,
          actor: {
            _id: params.actorId as never,
            name: params.actorName,
            role: 'admin',
          } as unknown as NonNullable<Parameters<typeof recordAuditLog>[0]['actor']>,
        });
        gatewayRefundHandled = true;
      }
    }

    await OrderModel.updateOne(
      { _id: ret.orderId },
      {
        $set: { orderStatus: 'returned', paymentStatus: 'refunded', fulfillmentStatus: 'returned' },
        $push: {
          statusHistory: {
            fromStatus: 'return_requested',
            toStatus: 'returned',
            actorId: params.actorId,
            actorName: params.actorName,
            reason: params.inspectionNotes || 'Return verified and refunded',
            timestamp: new Date(),
          },
        },
      },
    );
    if (!gatewayRefundHandled) {
      await PaymentTransactionModel.updateMany(
        { orderId: ret.orderId, provider: 'cod', status: { $in: ['paid', 'refund_pending'] } },
        { $set: { status: 'refunded', refundedAmount: ret.refundAmount } },
      );
    }
  }

  await ret.save();
  return { returnRequest: { ...ret.toObject(), id: String(ret._id) }, orderNumber: ret.orderNumber };
}

export async function listPaymentTransactionsAdmin(params: {
  q?: string;
  status?: string;
  provider?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const filter: Record<string, unknown> = {};

  if (params.status) filter.status = params.status;
  if (params.provider) filter.provider = params.provider;
  if (params.paymentMethod) filter.paymentMethod = params.paymentMethod;

  if (params.dateFrom || params.dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (params.dateFrom) {
      const d = new Date(params.dateFrom);
      if (!Number.isNaN(d.getTime())) createdAtFilter.$gte = d;
    }
    if (params.dateTo) {
      const d = new Date(params.dateTo);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = d;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) filter.createdAt = createdAtFilter;
  }

  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: regex },
      { transactionId: regex },
      { gatewayPaymentId: regex },
      { gatewayTransactionId: regex },
      { bankTransactionId: regex },
      { customerName: regex },
      { customerEmail: regex },
    ];
  }

  const [total, rawTxs, aggStats, codPendingAgg] = await Promise.all([
    PaymentTransactionModel.countDocuments(filter),
    PaymentTransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PaymentTransactionModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          volume: { $sum: '$amount' },
          refundedVolume: { $sum: { $ifNull: ['$refundedAmount', 0] } },
        },
      },
    ]),
    OrderModel.aggregate([
      { $match: { paymentMethod: 'cod', paymentStatus: 'unpaid', orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$total' } } },
    ]),
  ]);

  let totalCount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let refundedCount = 0;
  let paidVolume = 0;
  let refundedVolume = 0;

  for (const row of aggStats) {
    const c = Number(row.count || 0);
    const v = Number(row.volume || 0);
    const rv = Number(row.refundedVolume || 0);
    totalCount += c;
    refundedVolume += rv;
    if (row._id === 'paid' || row._id === 'partially_refunded') {
      paidCount += c;
      paidVolume += v;
    } else if (row._id === 'refunded') {
      refundedCount += c;
    } else if (row._id === 'initiated' || row._id === 'pending' || row._id === 'authorized') {
      pendingCount += c;
    } else if (row._id === 'failed' || row._id === 'cancelled' || row._id === 'expired') {
      failedCount += c;
    }
  }

  return {
    transactions: rawTxs.map((t) => serializePaymentTransaction(t as unknown as Record<string, unknown>)),
    summary: {
      totalCount,
      paidCount,
      pendingCount,
      failedCount,
      refundedCount,
      paidVolume,
      refundedVolume,
      codPendingCount: Number(codPendingAgg[0]?.count || 0),
      codPendingVolume: Number(codPendingAgg[0]?.volume || 0),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getPaymentTransactionDetailAdmin(idOrTranId: string) {
  const query = mongoose.isValidObjectId(idOrTranId)
    ? { _id: idOrTranId }
    : { transactionId: idOrTranId };
  const tx = await PaymentTransactionModel.findOne(query).lean();
  if (!tx) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Payment transaction not found.');

  const order = await OrderModel.findById(tx.orderId)
    .select('orderNumber orderStatus paymentStatus paymentMethod total subtotal discount shippingCharge customerName customerEmail customerPhone shippingAddress createdAt')
    .lean();

  return {
    transaction: serializePaymentTransaction(tx as unknown as Record<string, unknown>),
    order: order ? { ...order, id: String(order._id) } : null,
  };
}

export async function getPaymentAnalyticsAdmin(days = 30) {
  const windowDays = Math.min(365, Math.max(1, days));
  const since = new Date(Date.now() - windowDays * 86_400_000);

  const [byProvider, byMethod, dailySeries, codOrdersAgg] = await Promise.all([
    PaymentTransactionModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$provider',
          totalCount: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $in: ['$status', ['paid', 'partially_refunded', 'refunded']] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled', 'expired']] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $in: ['$status', ['initiated', 'pending', 'authorized']] }, 1, 0] },
          },
          paidVolume: {
            $sum: { $cond: [{ $in: ['$status', ['paid', 'partially_refunded']] }, '$amount', 0] },
          },
          refundedVolume: { $sum: { $ifNull: ['$refundedAmount', 0] } },
        },
      },
      { $sort: { paidVolume: -1 } },
    ]),
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$paymentMethod',
          ordersCount: { $sum: 1 },
          grossVolume: { $sum: '$total' },
          paidVolume: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] },
          },
        },
      },
      { $sort: { grossVolume: -1 } },
    ]),
    PaymentTransactionModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          attempts: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $in: ['$status', ['paid', 'partially_refunded']] }, 1, 0] },
          },
          paidVolume: {
            $sum: { $cond: [{ $in: ['$status', ['paid', 'partially_refunded']] }, '$amount', 0] },
          },
          refundedVolume: { $sum: { $ifNull: ['$refundedAmount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: since }, paymentMethod: 'cod', orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          volume: { $sum: '$total' },
        },
      },
    ]),
  ]);

  return {
    days: windowDays,
    byProvider: byProvider.map((p) => ({
      provider: String(p._id || 'unknown'),
      totalCount: Number(p.totalCount || 0),
      paidCount: Number(p.paidCount || 0),
      failedCount: Number(p.failedCount || 0),
      pendingCount: Number(p.pendingCount || 0),
      paidVolume: Number(p.paidVolume || 0),
      refundedVolume: Number(p.refundedVolume || 0),
      successRate:
        Number(p.totalCount || 0) > 0
          ? Number(((Number(p.paidCount || 0) / Number(p.totalCount || 0)) * 100).toFixed(1))
          : 0,
    })),
    byMethod: byMethod.map((m) => ({
      paymentMethod: String(m._id || 'unknown'),
      ordersCount: Number(m.ordersCount || 0),
      grossVolume: Number(m.grossVolume || 0),
      paidVolume: Number(m.paidVolume || 0),
    })),
    dailySeries: dailySeries.map((d) => ({
      date: String(d._id),
      attempts: Number(d.attempts || 0),
      paidCount: Number(d.paidCount || 0),
      paidVolume: Number(d.paidVolume || 0),
      refundedVolume: Number(d.refundedVolume || 0),
    })),
    codBreakdown: codOrdersAgg.map((c) => ({
      status: String(c._id),
      count: Number(c.count || 0),
      volume: Number(c.volume || 0),
    })),
  };
}

export async function listCancellationRequestsAdmin(params: {
  page: number;
  limit: number;
  status: string;
  q: string;
}) {
  const filter: Record<string, unknown> = {
    cancellationRequest: { $ne: null },
  };
  if (params.status && ['pending', 'approved', 'rejected'].includes(params.status)) {
    filter['cancellationRequest.status'] = params.status;
  } else {
    filter['cancellationRequest.status'] = { $in: ['pending', 'approved', 'rejected'] };
  }
  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: regex },
      { customerName: regex },
      { customerEmail: regex },
      { customerPhone: regex },
      { 'cancellationRequest.reason': regex },
    ];
  }

  const [total, pendingCount, approvedCount, rejectedCount, orders] = await Promise.all([
    OrderModel.countDocuments(filter),
    OrderModel.countDocuments({ 'cancellationRequest.status': 'pending' }),
    OrderModel.countDocuments({ 'cancellationRequest.status': 'approved' }),
    OrderModel.countDocuments({ 'cancellationRequest.status': 'rejected' }),
    OrderModel.find(filter)
      .sort({ 'cancellationRequest.requestedAt': -1, createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean(),
  ]);

  return {
    requests: orders.map((o) => ({
      ...o,
      id: String(o._id),
    })),
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      all: pendingCount + approvedCount + rejectedCount,
    },
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function reviewCancellationRequestAdmin(params: {
  orderId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
  actorId: unknown;
  actorName: string;
}) {
  if (!mongoose.isValidObjectId(params.orderId)) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  const existing = await OrderModel.findById(params.orderId).lean();
  if (!existing) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }
  if (!existing.cancellationRequest || existing.cancellationRequest.status !== 'pending') {
    throw new AppError(409, 'NO_PENDING_CANCELLATION', 'This order does not have a pending cancellation request.');
  }

  const now = new Date();
  const prevStatus = existing.orderStatus;

  if (params.action === 'approve') {
    if (['shipped', 'delivered', 'cancelled', 'returned'].includes(prevStatus)) {
      throw new AppError(
        409,
        'CANNOT_APPROVE_AFTER_DISPATCH',
        `Order in "${prevStatus}" status cannot be cancelled via request approval.`,
      );
    }

    const nextPaymentStatus =
      existing.paymentStatus === 'paid'
        ? 'refund_pending'
        : existing.paymentStatus === 'pending'
          ? 'cancelled'
          : existing.paymentStatus;

    const updated = await OrderModel.findOneAndUpdate(
      {
        _id: params.orderId,
        'cancellationRequest.status': 'pending',
        orderStatus: { $nin: ['shipped', 'delivered', 'cancelled', 'returned'] },
      },
      {
        $set: {
          orderStatus: 'cancelled',
          fulfillmentStatus: 'cancelled',
          paymentStatus: nextPaymentStatus,
          cancellationReason: existing.cancellationRequest.reason,
          'cancellationRequest.status': 'approved',
          'cancellationRequest.reviewedBy': params.actorId,
          'cancellationRequest.reviewedByName': params.actorName,
          'cancellationRequest.reviewedAt': now,
          'cancellationRequest.adminNotes': params.adminNotes || '',
        },
        $push: {
          statusHistory: {
            fromStatus: prevStatus,
            toStatus: 'cancelled',
            actorId: params.actorId,
            actorName: params.actorName,
            reason: `Cancellation request approved: ${existing.cancellationRequest.reason}`,
            timestamp: now,
          },
          cancellationHistory: {
            action: 'approved',
            actorId: params.actorId,
            actorName: params.actorName,
            reason: existing.cancellationRequest.reason,
            adminNotes: params.adminNotes || '',
            timestamp: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(409, 'CANCELLATION_REVIEW_CONFLICT', 'Cancellation request state changed before approval completed.');
    }

    if (shouldRestoreStockOnCancel(prevStatus, existing.paymentStatus)) {
      for (const item of existing.items) {
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
          reason: `Cancellation request approved (${existing.orderNumber})`,
          referenceId: existing.orderNumber,
          actorId: params.actorId,
          actorName: params.actorName,
        }).catch(() => undefined);
      }
    }

    if (existing.paymentStatus === 'paid') {
      await PaymentTransactionModel.updateMany(
        { orderId: existing._id, status: 'paid' },
        { $set: { status: 'refund_pending' } },
      ).catch(() => undefined);
    }

    await sendTransactionalEmail({
      to: existing.customerEmail,
      template: 'order_cancellation_approved',
      subject: `NOVARA COMMERCE — Order ${existing.orderNumber} Cancellation Approved`,
      html: `<p>Hello ${existing.customerName},</p><p>Your cancellation request for order <strong>${existing.orderNumber}</strong> has been approved.</p>${params.adminNotes ? `<p>Note: ${params.adminNotes}</p>` : ''}`,
    }).catch(() => undefined);

    return {
      order: { ...updated.toObject(), id: String(updated._id) },
      orderNumber: existing.orderNumber,
      action: 'approved' as const,
    };
  }

  // Reject cancellation request
  const updated = await OrderModel.findOneAndUpdate(
    {
      _id: params.orderId,
      'cancellationRequest.status': 'pending',
    },
    {
      $set: {
        'cancellationRequest.status': 'rejected',
        'cancellationRequest.reviewedBy': params.actorId,
        'cancellationRequest.reviewedByName': params.actorName,
        'cancellationRequest.reviewedAt': now,
        'cancellationRequest.adminNotes': params.adminNotes || '',
      },
      $push: {
        cancellationHistory: {
          action: 'rejected',
          actorId: params.actorId,
          actorName: params.actorName,
          reason: existing.cancellationRequest.reason,
          adminNotes: params.adminNotes || '',
          timestamp: now,
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new AppError(409, 'CANCELLATION_REVIEW_CONFLICT', 'Cancellation request state changed before rejection completed.');
  }

  await sendTransactionalEmail({
    to: existing.customerEmail,
    template: 'order_cancellation_rejected',
    subject: `NOVARA COMMERCE — Cancellation Request Update (${existing.orderNumber})`,
    html: `<p>Hello ${existing.customerName},</p><p>Your cancellation request for order <strong>${existing.orderNumber}</strong> could not be approved.</p>${params.adminNotes ? `<p>Operations Note: ${params.adminNotes}</p>` : ''}`,
  }).catch(() => undefined);

  return {
    order: { ...updated.toObject(), id: String(updated._id) },
    orderNumber: existing.orderNumber,
    action: 'rejected' as const,
  };
}

