import { env, getPaymentIntegrationsStatus } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import {
  amountsMatch,
  redactGatewayPayload,
  type GatewayInitiateInput,
  type GatewayInitiateOutput,
  type GatewayRefundInput,
  type GatewayRefundOutput,
  type GatewayVerifyInput,
  type GatewayVerifyOutput,
} from './types';

interface BkashTokenCache {
  idToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

const BKASH_HTTP_TIMEOUT_MS = 20_000;

let cachedBkashToken: BkashTokenCache | null = null;

export function clearBkashTokenCacheForTest() {
  cachedBkashToken = null;
}

async function getBkashIdToken(forceRefresh = false): Promise<string> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.bkash) {
    throw new AppError(
      503,
      'PAYMENT_GATEWAY_UNCONFIGURED',
      'bKash Tokenized Checkout credentials are not configured. Set BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, and BKASH_PASSWORD.',
    );
  }

  if (forceRefresh) {
    cachedBkashToken = null;
  }

  const now = Date.now();
  if (cachedBkashToken && cachedBkashToken.expiresAtMs > now + 60_000) {
    return cachedBkashToken.idToken;
  }

  const base = env.BKASH_BASE_URL.replace(/\/$/, '');

  // Try refresh if we already have a refreshToken
  if (!forceRefresh && cachedBkashToken?.refreshToken) {
    try {
      const refreshResp = await fetch(`${base}/tokenized/checkout/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          username: env.BKASH_USERNAME,
          password: env.BKASH_PASSWORD,
        },
        body: JSON.stringify({
          app_key: env.BKASH_APP_KEY,
          app_secret: env.BKASH_APP_SECRET,
          refresh_token: cachedBkashToken.refreshToken,
        }),
        signal: AbortSignal.timeout(BKASH_HTTP_TIMEOUT_MS),
      });
      const refreshData = (await refreshResp.json()) as {
        id_token?: string;
        refresh_token?: string;
        expires_in?: number;
        statusCode?: string;
      };
      if (refreshResp.ok && refreshData.id_token) {
        cachedBkashToken = {
          idToken: refreshData.id_token,
          refreshToken: refreshData.refresh_token || cachedBkashToken.refreshToken,
          expiresAtMs: Date.now() + Number(refreshData.expires_in || 3600) * 1000,
        };
        return cachedBkashToken.idToken;
      }
    } catch {
      // Fall through to full grant
    }
  }

  const resp = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: env.BKASH_USERNAME,
      password: env.BKASH_PASSWORD,
    },
    body: JSON.stringify({
      app_key: env.BKASH_APP_KEY,
      app_secret: env.BKASH_APP_SECRET,
    }),
    signal: AbortSignal.timeout(BKASH_HTTP_TIMEOUT_MS),
  });

  const data = (await resp.json()) as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    statusCode?: string;
    statusMessage?: string;
  };

  if (!resp.ok || !data.id_token) {
    cachedBkashToken = null;
    throw new AppError(
      502,
      'BKASH_AUTH_FAILED',
      data.statusMessage || 'Failed to authenticate merchant session with bKash Tokenized Checkout API.',
    );
  }

  cachedBkashToken = {
    idToken: data.id_token,
    refreshToken: data.refresh_token || '',
    expiresAtMs: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return cachedBkashToken.idToken;
}

async function bkashAuthorizedPost<T>(endpointPath: string, payload: Record<string, unknown>): Promise<{ resp: Response; data: T }> {
  const base = env.BKASH_BASE_URL.replace(/\/$/, '');
  const url = `${base}${endpointPath}`;

  let idToken = await getBkashIdToken(false);
  let resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: idToken,
      'X-APP-Key': env.BKASH_APP_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(BKASH_HTTP_TIMEOUT_MS),
  });

  if (resp.status === 401) {
    idToken = await getBkashIdToken(true);
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: idToken,
        'X-APP-Key': env.BKASH_APP_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(BKASH_HTTP_TIMEOUT_MS),
    });
  }

  const data = (await resp.json()) as T;
  return { resp, data };
}

export async function initiateBkashPayment(params: GatewayInitiateInput): Promise<GatewayInitiateOutput> {
  const callbackUrl = `${env.APP_URL}/api/payments/callback/bkash?tran_id=${encodeURIComponent(params.transactionId)}`;

  const { resp, data } = await bkashAuthorizedPost<{
    paymentID?: string;
    bkashURL?: string;
    transactionStatus?: string;
    statusCode?: string;
    statusMessage?: string;
  }>('/tokenized/checkout/create', {
    mode: '0011',
    payerReference: params.customerPhone || params.transactionId,
    callbackURL: callbackUrl,
    amount: params.amount.toFixed(2),
    currency: params.currency || 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: params.transactionId,
  });

  if (!resp.ok || !data.paymentID || !data.bkashURL || (data.statusCode && data.statusCode !== '0000')) {
    throw new AppError(
      502,
      'PAYMENT_INITIATION_FAILED',
      data.statusMessage || 'Failed to create bKash payment session.',
    );
  }

  return {
    provider: 'bkash',
    gatewayUrl: data.bkashURL,
    gatewayPaymentId: data.paymentID,
    raw: redactGatewayPayload(data),
  };
}

export async function executeAndVerifyBkashPayment(input: GatewayVerifyInput): Promise<GatewayVerifyOutput> {
  const paymentID = input.gatewayPaymentId || String(input.payload?.paymentID || '');
  if (!paymentID) {
    return {
      verified: false,
      status: 'failed',
      failureReason: 'Missing bKash paymentID on callback.',
    };
  }

  const { resp, data } = await bkashAuthorizedPost<{
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    amount?: string | number;
    currency?: string;
    merchantInvoiceNumber?: string;
    statusCode?: string;
    statusMessage?: string;
  }>('/tokenized/checkout/execute', { paymentID });

  // If execute fails because it was already executed, fall back to queryPaymentStatus
  if (!resp.ok || data.statusCode !== '0000' || data.transactionStatus !== 'Completed') {
    if (data.statusCode === '2062' || String(data.statusMessage || '').toLowerCase().includes('already')) {
      return queryBkashPaymentStatus({
        ...input,
        gatewayPaymentId: paymentID,
      });
    }
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentID,
      failureReason: data.statusMessage || `bKash execute returned status "${data.transactionStatus || data.statusCode || 'FAILED'}".`,
      raw: redactGatewayPayload(data),
    };
  }

  const verifiedAmount = Number(data.amount || 0);
  const currency = String(data.currency || 'BDT').toUpperCase();
  const invoice = String(data.merchantInvoiceNumber || '');

  if (invoice && invoice !== input.transactionId) {
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentID,
      failureReason: `bKash merchantInvoiceNumber mismatch (expected ${input.transactionId}, received ${invoice}).`,
      raw: redactGatewayPayload(data),
    };
  }

  if (currency !== (input.expectedCurrency || 'BDT') || !amountsMatch(input.expectedAmount, verifiedAmount)) {
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentID,
      verifiedAmount,
      currency,
      failureReason: `bKash amount/currency mismatch (expected ${input.expectedAmount} BDT, received ${verifiedAmount} ${currency}).`,
      raw: redactGatewayPayload(data),
    };
  }

  return {
    verified: true,
    status: 'paid',
    verifiedAmount,
    currency,
    tranId: invoice || input.transactionId,
    gatewayPaymentId: paymentID,
    gatewayTransactionId: data.trxID,
    bankTransactionId: data.trxID,
    raw: redactGatewayPayload(data),
  };
}

export async function queryBkashPaymentStatus(input: GatewayVerifyInput): Promise<GatewayVerifyOutput> {
  const paymentID = input.gatewayPaymentId || String(input.payload?.paymentID || '');
  if (!paymentID) {
    return { verified: false, status: 'pending', failureReason: 'No bKash paymentID recorded to query.' };
  }

  const { resp, data } = await bkashAuthorizedPost<{
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    amount?: string | number;
    currency?: string;
    merchantInvoiceNumber?: string;
    statusCode?: string;
    statusMessage?: string;
  }>('/tokenized/checkout/payment/status', { paymentID });

  if (!resp.ok) {
    return {
      verified: false,
      status: 'pending',
      gatewayPaymentId: paymentID,
      failureReason: data.statusMessage || `bKash status query returned HTTP ${resp.status}.`,
      raw: redactGatewayPayload(data),
    };
  }

  const txStatus = String(data.transactionStatus || '');
  if (txStatus === 'Completed' && data.trxID) {
    const verifiedAmount = Number(data.amount || 0);
    const currency = String(data.currency || 'BDT').toUpperCase();
    if (!amountsMatch(input.expectedAmount, verifiedAmount) || currency !== (input.expectedCurrency || 'BDT')) {
      return {
        verified: false,
        status: 'failed',
        gatewayPaymentId: paymentID,
        verifiedAmount,
        currency,
        failureReason: 'bKash amount or currency mismatch on reconciliation query.',
        raw: redactGatewayPayload(data),
      };
    }
    return {
      verified: true,
      status: 'paid',
      verifiedAmount,
      currency,
      tranId: String(data.merchantInvoiceNumber || input.transactionId),
      gatewayPaymentId: paymentID,
      gatewayTransactionId: data.trxID,
      bankTransactionId: data.trxID,
      raw: redactGatewayPayload(data),
    };
  }

  if (txStatus === 'Cancelled') {
    return { verified: false, status: 'cancelled', gatewayPaymentId: paymentID, failureReason: 'bKash payment cancelled.', raw: redactGatewayPayload(data) };
  }
  if (txStatus === 'Failed') {
    return { verified: false, status: 'failed', gatewayPaymentId: paymentID, failureReason: data.statusMessage || 'bKash payment failed.', raw: redactGatewayPayload(data) };
  }
  if (txStatus === 'Authorized') {
    return { verified: false, status: 'authorized', gatewayPaymentId: paymentID, raw: redactGatewayPayload(data) };
  }

  return {
    verified: false,
    status: 'pending',
    gatewayPaymentId: paymentID,
    failureReason: `bKash status: ${txStatus || data.statusMessage || 'Initiated'}.`,
    raw: redactGatewayPayload(data),
  };
}

export async function refundBkashPayment(input: GatewayRefundInput): Promise<GatewayRefundOutput> {
  if (!input.gatewayPaymentId || !input.gatewayTransactionId) {
    throw new AppError(
      400,
      'MISSING_BKASH_REF',
      'bKash refund requires both paymentID and trxID from a completed payment.',
    );
  }

  const { resp, data } = await bkashAuthorizedPost<{
    statusCode?: string;
    statusMessage?: string;
    refundTrxID?: string;
    transactionStatus?: string;
  }>('/tokenized/checkout/payment/refund', {
    paymentID: input.gatewayPaymentId,
    amount: input.amount.toFixed(2),
    trxID: input.gatewayTransactionId,
    sku: input.sku || input.transactionId,
    reason: input.reason.slice(0, 200),
  });

  if (!resp.ok || data.statusCode !== '0000' || !data.refundTrxID) {
    return {
      success: false,
      status: 'failed',
      failureReason: data.statusMessage || `bKash refund rejected (${data.statusCode || resp.status}).`,
      raw: redactGatewayPayload(data),
    };
  }

  return {
    success: true,
    gatewayRefundId: data.refundTrxID,
    status: 'completed',
    raw: redactGatewayPayload(data),
  };
}
