import crypto from 'node:crypto';
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

const SSLCOMMERZ_HTTP_TIMEOUT_MS = 20_000;

function getSslCommerzBaseUrl(): string {
  return env.PAYMENT_SANDBOX ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
}

export function verifySslCommerzIpnSignature(payload: Record<string, unknown>): boolean {
  const verifySign = String(payload.verify_sign || '').trim().toLowerCase();
  const verifyKeyRaw = String(payload.verify_key || '').trim();
  if (!verifySign || !verifyKeyRaw || !env.PAYMENT_STORE_PASSWORD) {
    return false;
  }

  const keys = verifyKeyRaw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) return false;

  const storePasswdHash = crypto.createHash('md5').update(env.PAYMENT_STORE_PASSWORD).digest('hex');
  const map: Record<string, string> = { store_passwd: storePasswdHash };
  for (const key of keys) {
    map[key] = String(payload[key] ?? '');
  }

  const sortedKeys = Object.keys(map).sort();
  const hashString = sortedKeys.map((k) => `${k}=${map[k]}`).join('&');
  const computed = crypto.createHash('md5').update(hashString).digest('hex').toLowerCase();

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(verifySign, 'utf8'));
  } catch {
    return false;
  }
}

export async function initiateSslCommerzSession(params: GatewayInitiateInput): Promise<GatewayInitiateOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.sslcommerz) {
    throw new AppError(
      503,
      'PAYMENT_GATEWAY_UNCONFIGURED',
      'Online payment gateway (SSLCommerz) credentials are not configured. Set PAYMENT_STORE_ID and PAYMENT_STORE_PASSWORD or choose another enabled method.',
    );
  }

  const base = getSslCommerzBaseUrl();
  const bodyObj: Record<string, string> = {
    store_id: env.PAYMENT_STORE_ID,
    store_passwd: env.PAYMENT_STORE_PASSWORD,
    total_amount: String(params.amount.toFixed(2)),
    currency: params.currency || 'BDT',
    tran_id: params.transactionId,
    success_url: `${env.APP_URL}/api/payments/callback/sslcommerz/success`,
    fail_url: `${env.APP_URL}/api/payments/callback/sslcommerz/fail`,
    cancel_url: `${env.APP_URL}/api/payments/callback/sslcommerz/cancel`,
    ipn_url: `${env.APP_URL}/api/payments/ipn/sslcommerz`,
    shipping_method: 'Courier',
    product_name: `NOVARA Order ${params.orderNumber}`,
    product_category: 'Retail',
    product_profile: 'general',
    cus_name: params.customerName,
    cus_email: params.customerEmail,
    cus_add1: `${params.shippingAddress.house}, ${params.shippingAddress.area}`,
    cus_city: params.shippingAddress.district,
    cus_state: params.shippingAddress.division,
    cus_postcode: params.shippingAddress.postalCode || '1000',
    cus_country: 'Bangladesh',
    cus_phone: params.customerPhone,
    ship_name: params.customerName,
    ship_add1: `${params.shippingAddress.house}, ${params.shippingAddress.area}`,
    ship_city: params.shippingAddress.district,
    ship_state: params.shippingAddress.division,
    ship_postcode: params.shippingAddress.postalCode || '1000',
    ship_country: 'Bangladesh',
  };

  if (params.paymentMethod === 'card') {
    bodyObj.multi_card_name = 'visacard,mastercard,amexcard,othercard';
  } else if (params.paymentMethod === 'bkash') {
    bodyObj.multi_card_name = 'bkash';
  } else if (params.paymentMethod === 'nagad') {
    bodyObj.multi_card_name = 'nagad';
  }

  const body = new URLSearchParams(bodyObj);
  const resp = await fetch(`${base}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(SSLCOMMERZ_HTTP_TIMEOUT_MS),
  });

  const data = (await resp.json()) as {
    status?: string;
    GatewayPageURL?: string;
    sessionkey?: string;
    failedreason?: string;
  };

  if (!resp.ok || data.status !== 'SUCCESS' || !data.GatewayPageURL) {
    throw new AppError(
      502,
      'PAYMENT_INITIATION_FAILED',
      data.failedreason || 'Failed to initiate payment session with SSLCommerz gateway.',
    );
  }

  return {
    provider: 'sslcommerz',
    gatewayUrl: data.GatewayPageURL,
    gatewaySessionKey: data.sessionkey,
    raw: redactGatewayPayload(data),
  };
}

export async function verifySslCommerzPayment(input: GatewayVerifyInput): Promise<GatewayVerifyOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.sslcommerz) {
    return {
      verified: false,
      status: 'failed',
      failureReason: 'SSLCommerz credentials are not configured.',
    };
  }

  const base = getSslCommerzBaseUrl();
  const valId = input.gatewayValidationId || String(input.payload?.val_id || '');
  if (!valId) {
    return querySslCommerzByTranId(input.transactionId, input.expectedAmount, input.expectedCurrency);
  }

  // If IPN/callback provided verify_sign + verify_key, validate signature
  if (input.payload && (input.payload.verify_sign || input.payload.verify_key)) {
    if (!verifySslCommerzIpnSignature(input.payload)) {
      return {
        verified: false,
        status: 'failed',
        failureReason: 'SSLCommerz signature (verify_sign) validation failed.',
        raw: redactGatewayPayload(input.payload),
      };
    }
  }

  const url = `${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    valId,
  )}&store_id=${encodeURIComponent(env.PAYMENT_STORE_ID)}&store_passwd=${encodeURIComponent(
    env.PAYMENT_STORE_PASSWORD,
  )}&format=json`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(SSLCOMMERZ_HTTP_TIMEOUT_MS) });
  if (!resp.ok) {
    return {
      verified: false,
      status: 'pending',
      failureReason: `SSLCommerz validator returned HTTP ${resp.status}.`,
    };
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const rawStatus = String(data.status || '').toUpperCase();
  const tranId = String(data.tran_id || '');
  const amount = Number(data.amount || 0);
  const currency = String(data.currency || data.currency_type || 'BDT').toUpperCase();
  const bankTranId = String(data.bank_tran_id || '');

  if (rawStatus !== 'VALID' && rawStatus !== 'VALIDATED') {
    return {
      verified: false,
      status: rawStatus === 'CANCELLED' ? 'cancelled' : 'failed',
      tranId,
      gatewayValidationId: valId,
      bankTransactionId: bankTranId || undefined,
      failureReason: `SSLCommerz validation returned status "${rawStatus || 'UNKNOWN'}".`,
      raw: redactGatewayPayload(data),
    };
  }

  if (tranId && tranId !== input.transactionId) {
    return {
      verified: false,
      status: 'failed',
      tranId,
      gatewayValidationId: valId,
      failureReason: `Transaction ID mismatch (expected ${input.transactionId}, received ${tranId}).`,
      raw: redactGatewayPayload(data),
    };
  }

  if (currency !== (input.expectedCurrency || 'BDT')) {
    return {
      verified: false,
      status: 'failed',
      tranId,
      gatewayValidationId: valId,
      failureReason: `Currency mismatch (expected ${input.expectedCurrency || 'BDT'}, received ${currency}).`,
      raw: redactGatewayPayload(data),
    };
  }

  if (!amountsMatch(input.expectedAmount, amount)) {
    return {
      verified: false,
      status: 'failed',
      verifiedAmount: amount,
      tranId,
      gatewayValidationId: valId,
      failureReason: `Amount mismatch (expected ${input.expectedAmount}, gateway confirmed ${amount}).`,
      raw: redactGatewayPayload(data),
    };
  }

  return {
    verified: true,
    status: 'paid',
    verifiedAmount: amount,
    currency,
    tranId: tranId || input.transactionId,
    gatewayValidationId: valId,
    gatewayTransactionId: bankTranId || valId,
    bankTransactionId: bankTranId || undefined,
    raw: redactGatewayPayload(data),
  };
}

export async function querySslCommerzByTranId(
  transactionId: string,
  expectedAmount: number,
  expectedCurrency = 'BDT',
): Promise<GatewayVerifyOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.sslcommerz) {
    return { verified: false, status: 'pending', failureReason: 'SSLCommerz not configured.' };
  }

  const base = getSslCommerzBaseUrl();
  const url = `${base}/validator/api/merchantTransIDvalidationAPI.php?tran_id=${encodeURIComponent(
    transactionId,
  )}&store_id=${encodeURIComponent(env.PAYMENT_STORE_ID)}&store_passwd=${encodeURIComponent(
    env.PAYMENT_STORE_PASSWORD,
  )}&format=json`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(SSLCOMMERZ_HTTP_TIMEOUT_MS) });
  if (!resp.ok) {
    return { verified: false, status: 'pending', failureReason: `SSLCommerz query returned HTTP ${resp.status}.` };
  }

  const data = (await resp.json()) as {
    APIConnect?: string;
    no_of_trans_found?: number;
    element?: Array<Record<string, unknown>>;
    status?: string;
  };

  const elem = Array.isArray(data.element) && data.element.length > 0 ? data.element[0] : (data as Record<string, unknown>);
  const rawStatus = String(elem.status || '').toUpperCase();
  if (rawStatus === 'VALID' || rawStatus === 'VALIDATED') {
    const amount = Number(elem.amount || 0);
    const currency = String(elem.currency_type || elem.currency || 'BDT').toUpperCase();
    const valId = String(elem.val_id || '');
    const bankTranId = String(elem.bank_tran_id || '');
    if (!amountsMatch(expectedAmount, amount) || currency !== expectedCurrency) {
      return {
        verified: false,
        status: 'failed',
        verifiedAmount: amount,
        currency,
        failureReason: 'Amount or currency mismatch on SSLCommerz query.',
        raw: redactGatewayPayload(elem),
      };
    }
    return {
      verified: true,
      status: 'paid',
      verifiedAmount: amount,
      currency,
      tranId: String(elem.tran_id || transactionId),
      gatewayValidationId: valId || undefined,
      gatewayTransactionId: bankTranId || valId || undefined,
      bankTransactionId: bankTranId || undefined,
      raw: redactGatewayPayload(elem),
    };
  }

  if (rawStatus === 'FAILED' || rawStatus === 'INVALID_TRANSACTION') {
    return {
      verified: false,
      status: 'failed',
      failureReason: `SSLCommerz reported ${rawStatus}.`,
      raw: redactGatewayPayload(elem),
    };
  }
  if (rawStatus === 'CANCELLED') {
    return {
      verified: false,
      status: 'cancelled',
      failureReason: 'SSLCommerz transaction cancelled.',
      raw: redactGatewayPayload(elem),
    };
  }

  return {
    verified: false,
    status: 'pending',
    failureReason: `SSLCommerz status is ${rawStatus || 'PENDING'}.`,
    raw: redactGatewayPayload(data),
  };
}

export async function refundSslCommerzPayment(input: GatewayRefundInput): Promise<GatewayRefundOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.sslcommerz) {
    throw new AppError(503, 'PAYMENT_GATEWAY_UNCONFIGURED', 'SSLCommerz credentials are not configured.');
  }

  const bankTranId = input.bankTransactionId || input.gatewayTransactionId;
  if (!bankTranId) {
    throw new AppError(
      400,
      'MISSING_BANK_TRAN_ID',
      'SSLCommerz refund requires bank_tran_id from a verified transaction.',
    );
  }

  const base = getSslCommerzBaseUrl();
  const params = new URLSearchParams({
    refund_amount: input.amount.toFixed(2),
    refund_remarks: input.reason.slice(0, 120),
    bank_tran_id: bankTranId,
    store_id: env.PAYMENT_STORE_ID,
    store_passwd: env.PAYMENT_STORE_PASSWORD,
    v: '1',
    format: 'json',
  });

  const resp = await fetch(`${base}/validator/api/merchantTransIDvalidationAPI.php?${params.toString()}`, {
    signal: AbortSignal.timeout(SSLCOMMERZ_HTTP_TIMEOUT_MS),
  });
  const data = (await resp.json()) as {
    APIConnect?: string;
    bank_tran_id?: string;
    refund_ref_id?: string;
    status?: string;
    errorReason?: string;
  };

  const okStatus = String(data.status || '').toLowerCase() === 'success';
  if (!resp.ok || !okStatus) {
    return {
      success: false,
      status: 'failed',
      failureReason: data.errorReason || `SSLCommerz refund failed (${data.status || resp.status}).`,
      raw: redactGatewayPayload(data),
    };
  }

  return {
    success: true,
    gatewayRefundId: data.refund_ref_id || `SSLR-${Date.now()}`,
    status: 'completed',
    raw: redactGatewayPayload(data),
  };
}
