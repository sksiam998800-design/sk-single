import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  addOrderNoteController,
  getOrderController,
  getOrderStatsController,
  getPaymentAnalyticsController,
  getPaymentDetailController,
  listCancellationRequestsController,
  listOrdersController,
  listPaymentsController,
  listReturnsController,
  reconcilePaymentController,
  reconcilePendingPaymentsController,
  refundPaymentController,
  reviewCancellationRequestController,
  updateOrderPaymentStatusController,
  updateOrderStatusController,
  updateReturnController,
} from './order.admin.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/orders/stats', requirePermission('orders.view'), getOrderStatsController);
router.get('/orders', requirePermission('orders.view'), listOrdersController);
router.get('/orders/:id', requirePermission('orders.view'), getOrderController);
router.patch('/orders/:id/status', requirePermission('orders.manage_fulfillment'), updateOrderStatusController);
router.patch('/orders/:id/payment-status', requirePermission('orders.manage_fulfillment'), updateOrderPaymentStatusController);
router.post('/orders/:id/notes', requirePermission('orders.view'), addOrderNoteController);

router.get('/returns', requirePermission('orders.view'), listReturnsController);
router.patch('/returns/:id', requirePermission('refunds.manage'), updateReturnController);

router.get('/cancellation-requests', requirePermission('orders.view'), listCancellationRequestsController);
router.patch('/cancellation-requests/:orderId', requirePermission('orders.manage_fulfillment'), reviewCancellationRequestController);

router.get('/payments/analytics', requirePermission('payments.view'), getPaymentAnalyticsController);
router.post('/payments/reconcile-pending', requirePermission('payments.reconcile'), reconcilePendingPaymentsController);
router.get('/payments', requirePermission('payments.view'), listPaymentsController);
router.get('/payments/:id', requirePermission('payments.view'), getPaymentDetailController);
router.post('/payments/:id/reconcile', requirePermission('payments.reconcile'), reconcilePaymentController);
router.post('/payments/:id/refund', requirePermission('refunds.manage'), refundPaymentController);

export default router;
