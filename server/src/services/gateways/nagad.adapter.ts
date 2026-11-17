import crypto from 'node:crypto';
import { env, getPaymentIntegrationsStatus } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import {
  amountsMatch,
  redactGatewayPayload,
  type GatewayInitiateInput,
  type GatewayInitiateOutput,
  type GatewayVerifyInput,
  type GatewayVerifyOutput,
} from './types';

const NAGAD_HTTP_TIMEOUT_MS = 20_000;

function formatNagadDateTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  // Bangladesh Standard Time (UTC+6)
  const bst = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return (
    String(bst.getUTCFullYear()) +
    pad(bst.getUTCMonth() + 1) +
    pad(bst.getUTCDate()) +
    pad(bst.getUTCHours()) +
    pad(bst.getUTCMinutes()) +
    pad(bst.getUTCSeconds())
  );
}

function wrapPemKey(raw: string, type: 'PUBLIC KEY' | 'RSA PRIVATE KEY' | 'PRIVATE KEY'): string {
  if (raw.includes('-----BEGIN')) return raw;
  const cleaned = raw.replace(/\s+/g, '');
  const lines = cleaned.match(/.{1,64}/g)?.join('\n') || cleaned;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

function encryptWithNagadPublicKey(data: string): string {
  const pubPem = wrapPemKey(env.NAGAD_PUBLIC_KEY, 'PUBLIC KEY');
  const encrypted = crypto.publicEncrypt(
    {
      key: pubPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(data, 'utf8'),
  );
  return encrypted.toString('base64');
}

function signWithMerchantPrivateKey(data: string): string {
  const privPem = env.NAGAD_PRIVATE_KEY.includes('-----BEGIN')
    ? env.NAGAD_PRIVATE_KEY
    : wrapPemKey(env.NAGAD_PRIVATE_KEY, 'PRIVATE KEY');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data, 'utf8');
  return signer.sign(privPem, 'base64');
}

function decryptWithMerchantPrivateKey(base64Encrypted: string): string {
  const privPem = env.NAGAD_PRIVATE_KEY.includes('-----BEGIN')
    ? env.NAGAD_PRIVATE_KEY
    : wrapPemKey(env.NAGAD_PRIVATE_KEY, 'PRIVATE KEY');
  const decrypted = crypto.privateDecrypt(
    {
      key: privPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(base64Encrypted, 'base64'),
  );
  return decrypted.toString('utf8');
}

function verifyNagadSignature(plainText: string, signatureBase64: string): boolean {
  try {
    const pubPem = wrapPemKey(env.NAGAD_PUBLIC_KEY, 'PUBLIC KEY');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(plainText, 'utf8');
    return verifier.verify(pubPem, signatureBase64, 'base64');
  } catch {
    return false;
  }
}

function buildNagadHeaders(clientIp = '127.0.0.1'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-KM-Api-Version': 'v-0.2.0',
    'X-KM-IP-V4': clientIp,
    'X-KM-Client-Type': 'PC_WEB',
  };
}

function buildNagadAlphanumericOrderId(transactionId: string): string {
  // Nagad requires alphanumeric orderId up to 20 chars
  const alnum = transactionId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return alnum.slice(-20).padStart(10, 'N');
}

export async function initiateNagadPayment(params: GatewayInitiateInput): Promise<GatewayInitiateOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.nagad) {
    throw new AppError(
      503,
      'PAYMENT_GATEWAY_UNCONFIGURED',
      'Nagad merchant credentials are not configured. Set NAGAD_MERCHANT_ID, NAGAD_MERCHANT_NUMBER, NAGAD_PUBLIC_KEY, and NAGAD_PRIVATE_KEY.',
    );
  }

  const base = env.NAGAD_BASE_URL.replace(/\/$/, '');
  const gatewayOrderId = buildNagadAlphanumericOrderId(params.transactionId);
  const dateTime = formatNagadDateTime();
  const challenge = crypto.randomBytes(20).toString('hex');

  const initSensitiveJson = JSON.stringify({
    merchantId: env.NAGAD_MERCHANT_ID,
    datetime: dateTime,
    orderId: gatewayOrderId,
    challenge,
  });

  const initResp = await fetch(
    `${base}/check-out/initialize/${encodeURIComponent(env.NAGAD_MERCHANT_ID)}/${encodeURIComponent(gatewayOrderId)}`,
    {
      method: 'POST',
      headers: buildNagadHeaders(params.clientIp),
      body: JSON.stringify({
        accountNumber: env.NAGAD_MERCHANT_NUMBER,
        dateTime,
        sensitiveData: encryptWithNagadPublicKey(initSensitiveJson),
        signature: signWithMerchantPrivateKey(initSensitiveJson),
      }),
      signal: AbortSignal.timeout(NAGAD_HTTP_TIMEOUT_MS),
    },
  );

  const initData = (await initResp.json()) as {
    sensitiveData?: string;
    signature?: string;
    reason?: string;
    message?: string;
  };

  if (!initResp.ok || !initData.sensitiveData || !initData.signature) {
    throw new AppError(
      502,
      'NAGAD_INIT_FAILED',
      initData.message || initData.reason || 'Failed to initialize Nagad merchant checkout session.',
    );
  }

  const decryptedInitStr = decryptWithMerchantPrivateKey(initData.sensitiveData);
  if (!verifyNagadSignature(decryptedInitStr, initData.signature)) {
    throw new AppError(502, 'NAGAD_SIGNATURE_INVALID', 'Nagad initialization response signature verification failed.');
  }

  const decryptedInit = JSON.parse(decryptedInitStr) as {
    paymentReferenceId?: string;
    challenge?: string;
  };
  if (!decryptedInit.paymentReferenceId) {
    throw new AppError(502, 'NAGAD_REF_MISSING', 'Nagad did not return a paymentReferenceId.');
  }

  const completeSensitiveJson = JSON.stringify({
    merchantId: env.NAGAD_MERCHANT_ID,
    orderId: gatewayOrderId,
    currencyCode: '050',
    amount: params.amount.toFixed(2),
    challenge: decryptedInit.challenge || challenge,
  });

  const completeResp = await fetch(
    `${base}/check-out/complete/${encodeURIComponent(decryptedInit.paymentReferenceId)}`,
    {
      method: 'POST',
      headers: buildNagadHeaders(params.clientIp),
      body: JSON.stringify({
        sensitiveData: encryptWithNagadPublicKey(completeSensitiveJson),
        signature: signWithMerchantPrivateKey(completeSensitiveJson),
        merchantCallbackURL: `${env.APP_URL}/api/payments/callback/nagad?tran_id=${encodeURIComponent(params.transactionId)}`,
        additionalMerchantInfo: {
          orderNumber: params.orderNumber,
          transactionId: params.transactionId,
        },
      }),
      signal: AbortSignal.timeout(NAGAD_HTTP_TIMEOUT_MS),
    },
  );

  const completeData = (await completeResp.json()) as {
    callBackUrl?: string;
    status?: string;
    message?: string;
    reason?: string;
  };

  if (!completeResp.ok || !completeData.callBackUrl) {
    throw new AppError(
      502,
      'NAGAD_COMPLETE_FAILED',
      completeData.message || completeData.reason || 'Failed to complete Nagad checkout URL generation.',
    );
  }

  return {
    provider: 'nagad',
    gatewayUrl: completeData.callBackUrl,
    gatewayPaymentId: decryptedInit.paymentReferenceId,
    gatewaySessionKey: gatewayOrderId,
    gatewayOrderId,
    raw: redactGatewayPayload(completeData),
  };
}

export async function verifyNagadPayment(input: GatewayVerifyInput): Promise<GatewayVerifyOutput> {
  const caps = getPaymentIntegrationsStatus();
  if (!caps.nagad) {
    return {
      verified: false,
      status: 'failed',
      failureReason: 'Nagad merchant credentials are not configured.',
    };
  }

  const paymentRefId = input.paymentRefId || input.gatewayPaymentId || String(input.payload?.payment_ref_id || '');
  if (!paymentRefId) {
    return {
      verified: false,
      status: 'failed',
      failureReason: 'Missing Nagad payment_ref_id.',
    };
  }

  const base = env.NAGAD_BASE_URL.replace(/\/$/, '');
  const resp = await fetch(`${base}/verify/payment/${encodeURIComponent(paymentRefId)}`, {
    method: 'GET',
    headers: buildNagadHeaders(),
    signal: AbortSignal.timeout(NAGAD_HTTP_TIMEOUT_MS),
  });

  const data = (await resp.json()) as {
    merchantId?: string;
    orderId?: string;
    paymentRefId?: string;
    amount?: string | number;
    issuerPaymentRefNo?: string;
    status?: string;
    statusCode?: string;
    message?: string;
  };

  if (!resp.ok) {
    return {
      verified: false,
      status: 'pending',
      gatewayPaymentId: paymentRefId,
      failureReason: data.message || `Nagad verify returned HTTP ${resp.status}.`,
      raw: redactGatewayPayload(data),
    };
  }

  const rawStatus = String(data.status || '');
  if (rawStatus !== 'Success') {
    const mapped =
      rawStatus === 'Cancelled'
        ? ('cancelled' as const)
        : rawStatus === 'InProgress' || rawStatus === 'OrderInitiated'
          ? ('pending' as const)
          : ('failed' as const);
    return {
      verified: false,
      status: mapped,
      gatewayPaymentId: paymentRefId,
      failureReason: data.message || `Nagad payment status is ${rawStatus || 'Failed'}.`,
      raw: redactGatewayPayload(data),
    };
  }

  if (data.merchantId && data.merchantId !== env.NAGAD_MERCHANT_ID) {
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentRefId,
      failureReason: 'Nagad merchantId mismatch.',
      raw: redactGatewayPayload(data),
    };
  }

  const expectedOrderId = buildNagadAlphanumericOrderId(input.transactionId);
  const expectedCompactAlnum = input.transactionId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-20);
  if (
    data.orderId &&
    data.orderId !== expectedOrderId &&
    data.orderId !== expectedCompactAlnum &&
    data.orderId !== input.transactionId
  ) {
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentRefId,
      failureReason: `Nagad orderId mismatch (expected ${expectedOrderId}, received ${data.orderId}).`,
      raw: redactGatewayPayload(data),
    };
  }

  const verifiedAmount = Number(data.amount || 0);
  if (!amountsMatch(input.expectedAmount, verifiedAmount)) {
    return {
      verified: false,
      status: 'failed',
      gatewayPaymentId: paymentRefId,
      verifiedAmount,
      failureReason: `Nagad amount mismatch (expected ${input.expectedAmount}, received ${verifiedAmount}).`,
      raw: redactGatewayPayload(data),
    };
  }

  return {
    verified: true,
    status: 'paid',
    verifiedAmount,
    currency: 'BDT',
    tranId: input.transactionId,
    gatewayPaymentId: data.paymentRefId || paymentRefId,
    gatewayTransactionId: data.issuerPaymentRefNo || data.paymentRefId || paymentRefId,
    bankTransactionId: data.issuerPaymentRefNo || undefined,
    raw: redactGatewayPayload(data),
  };
}
