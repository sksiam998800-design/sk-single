import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';
import {
  addOrderNoteAdmin,
  getOrderDetailAdmin,
  getOrderStatsAdmin,
  getPaymentAnalyticsAdmin,
  getPaymentTransactionDetailAdmin,
  listCancellationRequestsAdmin,
  listOrdersAdmin,
  listPaymentTransactionsAdmin,
  listReturnsAdmin,
  reviewCancellationRequestAdmin,
  transitionOrderStatusAdmin,
  updateOrderPaymentStatusAdmin,
  updateReturnAdmin,
} from './order.admin.service';
import {
  reconcilePaymentTransactionAdmin,
  reconcilePendingPaymentsAdmin,
  refundPaymentTransactionAdmin,
} from '../../services/payment.service';
import {
  adminRefundSchema,
  cancellationRequestReviewSchema,
  orderNoteSchema,
  orderPaymentStatusUpdateSchema,
  orderStatusUpdateSchema,
  returnUpdateSchema,
} from './order.admin.validation';

export async function getOrderStatsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await getOrderStatsAdmin();
    sendSuccess(res, { stats });
  } catch (err) {
    next(err);
  }
}

export async function listOrdersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim();
    const statusGroup = String(req.query.statusGroup || '').trim();
    const paymentStatus = String(req.query.paymentStatus || '').trim();
    const fulfillmentStatus = String(req.query.fulfillmentStatus || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const sortBy = String(req.query.sortBy || '').trim();
    const sortOrder = String(req.query.sortOrder || '').trim();
    const data = await listOrdersAdmin({
      page,
      limit,
      q,
      status,
      statusGroup,
      paymentStatus,
      fulfillmentStatus,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getOrderController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getOrderDetailAdmin(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = orderStatusUpdateSchema.parse(req.body);
    const result = await transitionOrderStatusAdmin({
      id: req.params.id,
      ...parsed,
      actorId: req.user!._id,
      actorName: req.user!.name,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'order.status_change',
      resourceType: 'Order',
      resourceId: result.orderNumber,
      summary: `Order ${result.orderNumber} transitioned ${result.prevStatus} -> ${parsed.nextStatus}`,
    });
    sendSuccess(res, { order: result.order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderPaymentStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = orderPaymentStatusUpdateSchema.parse(req.body);
    const result = await updateOrderPaymentStatusAdmin({
      id: req.params.id,
      paymentStatus: parsed.paymentStatus,
      note: parsed.note,
      actorName: req.user!.name,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'order.payment_status_change',
      resourceType: 'Order',
      resourceId: result.orderNumber,
      summary: `Order ${result.orderNumber} payment updated ${result.prevPaymentStatus} -> ${parsed.paymentStatus}`,
    });
    sendSuccess(res, { order: result.order });
  } catch (err) {
    next(err);
  }
}

export async function addOrderNoteController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { note } = orderNoteSchema.parse(req.body);
    const order = await addOrderNoteAdmin(req.params.id, note, req.user!.name);
    sendSuccess(res, { order });
  } catch (err) {
    next(err);
  }
}

export async function listReturnsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const returns = await listReturnsAdmin();
    sendSuccess(res, { returns });
  } catch (err) {
    next(err);
  }
}

export async function updateReturnController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = returnUpdateSchema.parse(req.body);
    const result = await updateReturnAdmin({
      id: req.params.id,
      ...parsed,
      actorId: req.user!._id,
      actorName: req.user!.name,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'return.update',
      resourceType: 'ReturnRequest',
      resourceId: result.orderNumber,
      summary: `Updated return for ${result.orderNumber} to ${parsed.status}`,
    });
    sendSuccess(res, { returnRequest: result.returnRequest });
  } catch (err) {
    next(err);
  }
}

export async function listPaymentsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await listPaymentTransactionsAdmin({
      q: String(req.query.q || '').trim(),
      status: String(req.query.status || '').trim(),
      provider: String(req.query.provider || '').trim(),
      paymentMethod: String(req.query.paymentMethod || '').trim(),
      dateFrom: String(req.query.dateFrom || '').trim(),
      dateTo: String(req.query.dateTo || '').trim(),
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(100, Math.max(1, Number(req.query.limit || 25))),
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getPaymentDetailController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getPaymentTransactionDetailAdmin(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getPaymentAnalyticsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days || 30)));
    const analytics = await getPaymentAnalyticsAdmin(days);
    sendSuccess(res, { analytics });
  } catch (err) {
    next(err);
  }
}

export async function reconcilePaymentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await reconcilePaymentTransactionAdmin({
      idOrTranId: req.params.id,
      actor: req.user || undefined,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function reconcilePendingPaymentsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await reconcilePendingPaymentsAdmin({
      actor: req.user || undefined,
      limit: Math.min(50, Math.max(1, Number(req.body?.limit || 25))),
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refundPaymentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = adminRefundSchema.parse(req.body);
    const result = await refundPaymentTransactionAdmin({
      idOrTranId: req.params.id,
      amount: parsed.amount,
      reason: parsed.reason,
      actor: req.user!,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listCancellationRequestsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || 'pending').trim();
    const q = String(req.query.q || '').trim();
    const data = await listCancellationRequestsAdmin({ page, limit, status, q });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function reviewCancellationRequestController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = cancellationRequestReviewSchema.parse(req.body);
    const result = await reviewCancellationRequestAdmin({
      orderId: req.params.orderId,
      action: parsed.action,
      adminNotes: parsed.adminNotes,
      actorId: req.user!._id,
      actorName: req.user!.name,
    });
    await recordAuditLog({
      actor: req.user,
      action: `order.cancellation_request_${result.action}`,
      resourceType: 'Order',
      resourceId: result.orderNumber,
      summary: `Order ${result.orderNumber} cancellation request ${result.action} by ${req.user!.name}`,
    });
    sendSuccess(res, { order: result.order, action: result.action });
  } catch (err) {
    next(err);
  }
}

