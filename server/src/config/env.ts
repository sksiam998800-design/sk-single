import dotenv from 'dotenv';

dotenv.config();

function resolveServerPort(): number {
  const argIdx = process.argv.findIndex((arg) => arg === '--port' || arg.startsWith('--port='));
  if (argIdx !== -1) {
    const raw = process.argv[argIdx].includes('=')
      ? process.argv[argIdx].split('=')[1]
      : process.argv[argIdx + 1];
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const envPort = Number(process.env.PORT || 0);
  const nginxPort = Number(process.env.NGINX_PORT || 0);
  if (envPort > 0 && (!nginxPort || envPort !== nginxPort)) {
    return envPort;
  }

  return Number(process.env.DEFAULT_APP_PORT || 3000);
}

function normalizePem(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\\n/g, '\n').trim();
}

const bkashSandbox = process.env.BKASH_SANDBOX !== 'false';
const nagadSandbox = process.env.NAGAD_SANDBOX !== 'false';
const paymentSandbox = process.env.PAYMENT_SANDBOX !== 'false';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: resolveServerPort(),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  CLIENT_URL: process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  SESSION_SECRET: process.env.SESSION_SECRET || '',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  INITIAL_SUPER_ADMIN_EMAIL: process.env.INITIAL_SUPER_ADMIN_EMAIL || '',
  INITIAL_SUPER_ADMIN_PASSWORD: process.env.INITIAL_SUPER_ADMIN_PASSWORD || '',
  INITIAL_SUPER_ADMIN_NAME: process.env.INITIAL_SUPER_ADMIN_NAME || 'NOVARA Super Admin',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'NOVARA COMMERCE <no-reply@novara.com.bd>',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',

  // SSLCommerz (Visa / Mastercard / Cards / Multi-Channel PG)
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'sslcommerz',
  PAYMENT_STORE_ID: process.env.PAYMENT_STORE_ID || '',
  PAYMENT_STORE_PASSWORD: process.env.PAYMENT_STORE_PASSWORD || '',
  PAYMENT_SANDBOX: paymentSandbox,
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || '',

  // bKash Tokenized Checkout API
  BKASH_SANDBOX: bkashSandbox,
  BKASH_BASE_URL:
    process.env.BKASH_BASE_URL ||
    (bkashSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta'),
  BKASH_APP_KEY: process.env.BKASH_APP_KEY || '',
  BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || '',
  BKASH_USERNAME: process.env.BKASH_USERNAME || '',
  BKASH_PASSWORD: process.env.BKASH_PASSWORD || '',

  // Nagad Merchant Payment Gateway API
  NAGAD_SANDBOX: nagadSandbox,
  NAGAD_BASE_URL:
    process.env.NAGAD_BASE_URL ||
    (nagadSandbox
      ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs'),
  NAGAD_MERCHANT_ID: process.env.NAGAD_MERCHANT_ID || '',
  NAGAD_MERCHANT_NUMBER: process.env.NAGAD_MERCHANT_NUMBER || '',
  NAGAD_PUBLIC_KEY: normalizePem(process.env.NAGAD_PUBLIC_KEY),
  NAGAD_PRIVATE_KEY: normalizePem(process.env.NAGAD_PRIVATE_KEY),

  // Payment session expiration window
  PAYMENT_TIMEOUT_MINUTES: Math.max(5, Number(process.env.PAYMENT_TIMEOUT_MINUTES || 30)),
};

export function getPaymentIntegrationsStatus() {
  const sslcommerz = Boolean(env.PAYMENT_STORE_ID && env.PAYMENT_STORE_PASSWORD);
  const bkash = Boolean(env.BKASH_APP_KEY && env.BKASH_APP_SECRET && env.BKASH_USERNAME && env.BKASH_PASSWORD);
  const nagad = Boolean(
    env.NAGAD_MERCHANT_ID &&
      env.NAGAD_MERCHANT_NUMBER &&
      env.NAGAD_PUBLIC_KEY &&
      env.NAGAD_PRIVATE_KEY,
  );
  const card = sslcommerz;
  return {
    sslcommerz,
    bkash,
    nagad,
    card,
    anyOnline: sslcommerz || bkash || nagad,
    modes: {
      sslcommerz: env.PAYMENT_SANDBOX ? ('sandbox' as const) : ('production' as const),
      bkash: env.BKASH_SANDBOX ? ('sandbox' as const) : ('production' as const),
      nagad: env.NAGAD_SANDBOX ? ('sandbox' as const) : ('production' as const),
      card: env.PAYMENT_SANDBOX ? ('sandbox' as const) : ('production' as const),
    },
  };
}

export const integrations = {
  mongodb: Boolean(env.MONGODB_URI && env.MONGODB_URI.startsWith('mongodb')),
  cloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  resend: Boolean(env.RESEND_API_KEY),
  googleOAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  facebookOAuth: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
  get paymentGateway(): boolean {
    return getPaymentIntegrationsStatus().anyOnline;
  },
  get sslcommerz(): boolean {
    return getPaymentIntegrationsStatus().sslcommerz;
  },
  get bkash(): boolean {
    return getPaymentIntegrationsStatus().bkash;
  },
  get nagad(): boolean {
    return getPaymentIntegrationsStatus().nagad;
  },
  get card(): boolean {
    return getPaymentIntegrationsStatus().card;
  },
};

export function getJwtSecret(): string {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 16) {
    return env.JWT_SECRET;
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production environment.');
  }
  return 'novara-dev-ephemeral-jwt-secret-change-in-production';
}
