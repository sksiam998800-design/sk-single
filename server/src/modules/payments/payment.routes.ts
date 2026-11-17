import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { PaymentTransactionModel, serializePaymentTransaction } from '../orders/order.model';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import {
  getPaymentCapabilities,
  markPaymentFailedOrCancelled,
  queryPaymentStatusForUser,
  retryOrderPaymentForCustomer,
  verifyAndFinalizePayment,
} from '../../services/payment.service';
import { querySslCommerzByTranId, verifySslCommerzIpnSignature } from '../../services/gateways/sslcommerz.adapter';
import { env, getPaymentIntegrationsStatus } from '../../config/env';

function assertOptionalWebhookSecretValid(req: Request) {
  const providedHeader = String(req.headers['x-webhook-secret'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const candidate = providedHeader || bearerToken;
  if (!candidate) return;
  if (!env.PAYMENT_WEBHOOK_SECRET) return;
  try {
    const a = Buffer.from(candidate, 'utf8');
    const b = Buffer.from(env.PAYMENT_WEBHOOK_SECRET, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new AppError(401, 'INVALID_WEBHOOK_SECRET', 'Invalid payment webhook secret.');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'INVALID_WEBHOOK_SECRET', 'Invalid payment webhook secret.');
  }
}

const router = Router();

function mergePayload(req: Request): Record<string, unknown> {
  return {
    ...(req.query as Record<string, unknown>),
    ...(req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}),
  };
}

function redirectPaymentOutcome(
  res: Response,
  outcome: {
    status: string;
    orderId?: string;
    orderNumber?: string;
  },
) {
  if (outcome.status === 'paid' || outcome.status === 'already_paid') {
    if (outcome.orderId) {
      res.redirect(`${env.CLIENT_URL}/order-success/${outcome.orderId}?payment=success`);
      return;
    }
    res.redirect(`${env.CLIENT_URL}/account/orders?payment=success&order=${encodeURIComponent(outcome.orderNumber || '')}`);
    return;
  }

  if (outcome.status === 'pending') {
    if (outcome.orderId) {
      res.redirect(`${env.CLIENT_URL}/order-success/${outcome.orderId}?payment=pending`);
      return;
    }
    res.redirect(`${env.CLIENT_URL}/account/orders?payment=pending&order=${encodeURIComponent(outcome.orderNumber || '')}`);
    return;
  }

  if (outcome.status === 'cancelled') {
    const query = new URLSearchParams({ payment: 'cancelled' });
    if (outcome.orderNumber) query.set('order', outcome.orderNumber);
    if (outcome.orderId) query.set('orderId', outcome.orderId);
    res.redirect(`${env.CLIENT_URL}/checkout?${query.toString()}`);
    return;
  }

  if (outcome.orderId) {
    res.redirect(`${env.CLIENT_URL}/order-success/${outcome.orderId}?payment=failed`);
    return;
  }
  res.redirect(`${env.CLIENT_URL}/account/orders?payment=failed`);
}

// Public payment capabilities (never returns credentials or secrets)
router.get('/capabilities', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    capabilities: getPaymentCapabilities(),
    timeoutMinutes: env.PAYMENT_TIMEOUT_MINUTES,
  });
});

// Authenticated customer transaction history
router.get('/my', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const transactions = await PaymentTransactionModel.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({
      ok: true,
      transactions: transactions.map((t) => serializePaymentTransaction(t as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated initiate/retry payment for an existing order
router.post('/initiate', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = z
      .object({
        orderId: z.string().min(1),
        paymentMethod: z.enum(['sslcommerz', 'bkash', 'nagad', 'card']).optional(),
      })
      .parse(req.body);

    const result = await retryOrderPaymentForCustomer({
      orderId: parsed.orderId,
      userId: req.user!._id,
      paymentMethod: parsed.paymentMethod,
      clientIp: req.ip,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Authenticated transaction live status check
router.get('/:transactionId/status', requireDatabase, authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await queryPaymentStatusForUser({
      transactionId: req.params.transactionId,
      userId: req.user!._id,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// bKash Official Callback & Webhook Routes
// ============================================================
async function handleBkashCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = mergePayload(req);
    const tranId = String(payload.tranId || payload.tran_id || payload.merchantInvoiceNumber || '');
    const paymentID = String(payload.paymentID || payload.paymentId || '');
    const status = String(payload.status || '');

    const result = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: tranId || undefined,
      paymentId: paymentID || undefined,
      callbackStatus: status,
      source: 'callback',
      payload,
    });
    redirectPaymentOutcome(res, result);
  } catch (err) {
    next(err);
  }
}

router.get('/callback/bkash', requireDatabase, handleBkashCallback);
router.post('/callback/bkash', requireDatabase, handleBkashCallback);

router.post('/webhook/bkash', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    assertOptionalWebhookSecretValid(req);
    const payload = mergePayload(req);
    const tranId = String(payload.merchantInvoiceNumber || payload.tranId || payload.tran_id || '');
    const paymentID = String(payload.paymentID || payload.trxID || '');
    if (!tranId && !paymentID) {
      throw new AppError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Missing bKash transaction or payment identifier.');
    }

    const result = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: tranId || undefined,
      paymentId: paymentID || undefined,
      callbackStatus: String(payload.transactionStatus || payload.status || ''),
      source: 'webhook',
      payload,
    });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// Nagad Official Callback & Webhook Routes
// ============================================================
async function handleNagadCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = mergePayload(req);
    const tranId = String(payload.tranId || payload.tran_id || '');
    const paymentRefId = String(payload.payment_ref_id || payload.paymentRefId || '');
    const status = String(payload.status || '');

    const result = await verifyAndFinalizePayment({
      provider: 'nagad',
      tranId: tranId || undefined,
      paymentRefId: paymentRefId || undefined,
      callbackStatus: status,
      source: 'callback',
      payload,
    });
    redirectPaymentOutcome(res, result);
  } catch (err) {
    next(err);
  }
}

router.get('/callback/nagad', requireDatabase, handleNagadCallback);
router.post('/callback/nagad', requireDatabase, handleNagadCallback);

router.post('/webhook/nagad', requireDatabase, async (req: Request, res: Response, next: NextFunction) => {
  try {
    assertOptionalWebhookSecretValid(req);
    const payload = mergePayload(req);
    const tranId = String(payload.order_id || payload.tranId || payload.tran_id || '');
    const paymentRefId = String(payload.payment_ref_id || payload.paymentRefId || '');
    if (!tranId && !paymentRefId) {
      throw new AppError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Missing Nagad payment reference.');
    }

    const result = await verifyAndFinalizePayment({
      provider: 'nagad',
      tranId: tranId || undefined,
      paymentRefId: paymentRefId || undefined,
      callbackStatus: String(payload.status || ''),
      source: 'webhook',
      payload,
    });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SSLCommerz / Card IPN & Callback Routes
// ============================================================
async function handleSslCommerzIpn(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = mergePayload(req);
    const tranId = String(payload.tran_id || '');
    const valId = String(payload.val_id || '');
    if (!tranId) {
      res.status(400).json({ ok: false, error: 'Missing tran_id' });
      return;
    }

    // Require and verify SSLCommerz MD5 verify_sign signature on IPN notifications
    if (!payload.verify_sign || !payload.verify_key || !verifySslCommerzIpnSignature(payload)) {
      res.status(400).json({ ok: false, code: 'INVALID_SIGNATURE', error: 'Invalid or missing IPN verify_sign signature.' });
      return;
    }

    const ipnStatus = String(payload.status || '').toUpperCase();
    if (ipnStatus === 'FAILED' || ipnStatus === 'CANCELLED') {
      const outcome = await markPaymentFailedOrCancelled({
        tranId,
        outcome: ipnStatus === 'CANCELLED' ? 'cancelled' : 'failed',
        reason: String(payload.error || `SSLCommerz IPN reported ${ipnStatus}`),
        source: 'ipn',
        payload,
      });
      res.json({ ok: true, result: outcome });
      return;
    }

    if (!valId) {
      res.status(400).json({ ok: false, error: 'Missing val_id' });
      return;
    }

    const result = await verifyAndFinalizePayment({
      provider: 'sslcommerz',
      tranId,
      valId,
      source: 'ipn',
      payload,
    });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}

router.post('/ipn', requireDatabase, handleSslCommerzIpn);
router.post('/ipn/sslcommerz', requireDatabase, handleSslCommerzIpn);

async function handleSslCommerzSuccess(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = mergePayload(req);
    const tranId = String(payload.tran_id || '');
    const valId = String(payload.val_id || '');

    if (!tranId) {
      res.redirect(`${env.CLIENT_URL}/account/orders?payment=failed`);
      return;
    }

    const result = await verifyAndFinalizePayment({
      provider: 'sslcommerz',
      tranId,
      valId: valId || undefined,
      source: 'callback',
      payload,
    });
    redirectPaymentOutcome(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleSslCommerzFailureOrCancel(
  req: Request,
  res: Response,
  next: NextFunction,
  outcome: 'failed' | 'cancelled',
) {
  try {
    const payload = mergePayload(req);
    const tranId = String(payload.tran_id || '');
    if (!tranId) {
      redirectPaymentOutcome(res, { status: outcome });
      return;
    }

    const tx = await PaymentTransactionModel.findOne({ transactionId: tranId }).lean();
    if (!tx) {
      redirectPaymentOutcome(res, { status: outcome });
      return;
    }

    if (tx.status === 'paid' || tx.status === 'refunded' || tx.status === 'partially_refunded') {
      redirectPaymentOutcome(res, {
        status: 'already_paid',
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
      });
      return;
    }

    const hasSignedPayload = Boolean(payload.verify_sign && payload.verify_key);
    if (hasSignedPayload && !verifySslCommerzIpnSignature(payload)) {
      redirectPaymentOutcome(res, {
        status: 'pending',
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
      });
      return;
    }

    // Check authoritative SSLCommerz status when configured so spoofed callbacks cannot cancel a paid/active transaction
    if (getPaymentIntegrationsStatus().sslcommerz) {
      const gwStatus = await querySslCommerzByTranId(
        tranId,
        Number(tx.requestedAmount || tx.amount),
        tx.currency || 'BDT',
      ).catch(() => null);

      if (gwStatus?.verified) {
        const finalized = await verifyAndFinalizePayment({
          provider: 'sslcommerz',
          tranId,
          valId: gwStatus.gatewayValidationId,
          source: 'callback',
          payload,
        });
        redirectPaymentOutcome(res, finalized);
        return;
      }

      if (req.method === 'GET' && !hasSignedPayload && gwStatus?.status === 'pending') {
        redirectPaymentOutcome(res, {
          status: outcome,
          orderId: String(tx.orderId),
          orderNumber: tx.orderNumber,
        });
        return;
      }
    } else if (req.method === 'GET' && !hasSignedPayload) {
      redirectPaymentOutcome(res, {
        status: outcome,
        orderId: String(tx.orderId),
        orderNumber: tx.orderNumber,
      });
      return;
    }

    const defaultReason =
      outcome === 'cancelled'
        ? 'Payment cancelled by customer at SSLCommerz gateway'
        : String(payload.error || 'Payment failed at SSLCommerz gateway');

    const result = await markPaymentFailedOrCancelled({
      tranId,
      outcome,
      reason: defaultReason,
      source: 'callback',
      payload,
    });
    redirectPaymentOutcome(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleSslCommerzFail(req: Request, res: Response, next: NextFunction) {
  return handleSslCommerzFailureOrCancel(req, res, next, 'failed');
}

async function handleSslCommerzCancel(req: Request, res: Response, next: NextFunction) {
  return handleSslCommerzFailureOrCancel(req, res, next, 'cancelled');
}

router.post('/callback/success', requireDatabase, handleSslCommerzSuccess);
router.get('/callback/success', requireDatabase, handleSslCommerzSuccess);
router.post('/callback/sslcommerz/success', requireDatabase, handleSslCommerzSuccess);
router.get('/callback/sslcommerz/success', requireDatabase, handleSslCommerzSuccess);

router.post('/callback/fail', requireDatabase, handleSslCommerzFail);
router.get('/callback/fail', requireDatabase, handleSslCommerzFail);
router.post('/callback/sslcommerz/fail', requireDatabase, handleSslCommerzFail);
router.get('/callback/sslcommerz/fail', requireDatabase, handleSslCommerzFail);

router.post('/callback/cancel', requireDatabase, handleSslCommerzCancel);
router.get('/callback/cancel', requireDatabase, handleSslCommerzCancel);
router.post('/callback/sslcommerz/cancel', requireDatabase, handleSslCommerzCancel);
router.get('/callback/sslcommerz/cancel', requireDatabase, handleSslCommerzCancel);

export default router;
