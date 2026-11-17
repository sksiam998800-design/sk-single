import type { PaymentMethod, PaymentProvider, PaymentTransactionStatus } from '../../../../src/lib/orderStateMachine';

export interface GatewayInitiateInput {
  orderNumber: string;
  transactionId: string;
  amount: number;
  currency: 'BDT';
  paymentMethod: PaymentMethod;
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

export interface GatewayInitiateOutput {
  provider: PaymentProvider;
  gatewayUrl: string;
  gatewayPaymentId?: string;
  gatewaySessionKey?: string;
  gatewayOrderId?: string;
  raw?: Record<string, unknown>;
}

export interface GatewayVerifyInput {
  transactionId: string;
  expectedAmount: number;
  expectedCurrency?: string;
  gatewayPaymentId?: string;
  gatewayValidationId?: string;
  paymentRefId?: string;
  payload?: Record<string, unknown>;
}

export interface GatewayVerifyOutput {
  verified: boolean;
  status: PaymentTransactionStatus;
  verifiedAmount?: number;
  currency?: string;
  tranId?: string;
  gatewayPaymentId?: string;
  gatewayTransactionId?: string;
  gatewayValidationId?: string;
  bankTransactionId?: string;
  failureReason?: string;
  raw?: Record<string, unknown>;
}

export interface GatewayRefundInput {
  transactionId: string;
  gatewayPaymentId?: string;
  gatewayTransactionId?: string;
  bankTransactionId?: string;
  amount: number;
  reason: string;
  sku?: string;
}

export interface GatewayRefundOutput {
  success: boolean;
  gatewayRefundId?: string;
  status: 'completed' | 'pending' | 'failed';
  failureReason?: string;
  raw?: Record<string, unknown>;
}

export function amountsMatch(expected: number, actual: number, tolerance = 1): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  if (expected <= 0 || actual <= 0) return false;
  return Math.abs(expected - actual) <= tolerance;
}

const SENSITIVE_KEYS = new Set([
  'store_passwd',
  'app_secret',
  'password',
  'private_key',
  'privatekey',
  'id_token',
  'refresh_token',
  'access_token',
  'pan',
  'card_no',
  'cardno',
  'card_number',
  'cardnumber',
  'card_pan',
  'cvv',
  'cvv2',
  'cvc',
  'cvn',
  'security_code',
  'pin',
  'otp',
  'authorization',
]);

export function redactGatewayPayload(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes('secret') || lower.includes('passwd') || lower.includes('password')) {
      clean[key] = '[REDACTED]';
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = redactGatewayPayload(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
