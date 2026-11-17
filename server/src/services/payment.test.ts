import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { redactGatewayPayload, amountsMatch } from './gateways/types';
import {
  clearBkashTokenCacheForTest,
  executeAndVerifyBkashPayment,
  initiateBkashPayment,
  queryBkashPaymentStatus,
  refundBkashPayment,
} from './gateways/bkash.adapter';
import { initiateNagadPayment, verifyNagadPayment } from './gateways/nagad.adapter';
import {
  initiateSslCommerzSession,
  refundSslCommerzPayment,
  verifySslCommerzIpnSignature,
  verifySslCommerzPayment,
} from './gateways/sslcommerz.adapter';
import {
  getPaymentCapabilities,
  markPaymentFailedOrCancelled,
  refundPaymentTransactionAdmin,
  retryOrderPaymentForCustomer,
  verifyAndFinalizePayment,
} from './payment.service';
import { OrderModel, PaymentTransactionModel } from '../modules/orders/order.model';
import { CartModel } from '../modules/cart/cart.model';
import { ProductModel } from '../modules/products/product.model';
import { HomepageConfigModel } from '../modules/cms/cms.model';
import { InventoryMovementModel } from '../modules/inventory/inventoryMovement.model';
import { AuditLogModel, SystemLogModel } from '../modules/support/support.model';

function saveEnvSnapshot() {
  return { ...env };
}

function restoreEnvSnapshot(snapshot: typeof env) {
  Object.assign(env, snapshot);
}

const sampleShipping = {
  house: 'House 12',
  area: 'Kalabagan',
  upazila: 'Dhanmondi',
  district: 'Dhaka',
  division: 'Dhaka',
  postalCode: '1205',
};

test('redactGatewayPayload strips PAN, CVV, PIN, OTP, passwords, and tokens before DB storage', () => {
  const dirty = {
    tran_id: 'TXN-1001',
    card_no: '4111111111111111',
    cvv: '123',
    pin: '4567',
    otp: '998877',
    id_token: 'secret-jwt',
    store_passwd: 'supersecret',
    nested: {
      pan: '5200000000000000',
      safeField: 'VISA-HOSTED',
    },
  };
  const clean = redactGatewayPayload(dirty);
  assert.ok(clean);
  assert.equal(clean.tran_id, 'TXN-1001');
  assert.equal(clean.card_no, '[REDACTED]');
  assert.equal(clean.cvv, '[REDACTED]');
  assert.equal(clean.pin, '[REDACTED]');
  assert.equal(clean.otp, '[REDACTED]');
  assert.equal(clean.id_token, '[REDACTED]');
  assert.equal(clean.store_passwd, '[REDACTED]');
  assert.equal((clean.nested as Record<string, unknown>).pan, '[REDACTED]');
  assert.equal((clean.nested as Record<string, unknown>).safeField, 'VISA-HOSTED');
  assert.equal(amountsMatch(1500, 1500.5), true);
  assert.equal(amountsMatch(1500, 1495), false);
});

test('Unconfigured gateways fail closed (503) and capabilities reflect exact env readiness', async () => {
  const snap = saveEnvSnapshot();
  try {
    env.BKASH_APP_KEY = '';
    env.BKASH_APP_SECRET = '';
    env.BKASH_USERNAME = '';
    env.BKASH_PASSWORD = '';
    env.NAGAD_MERCHANT_ID = '';
    env.NAGAD_MERCHANT_NUMBER = '';
    env.NAGAD_PUBLIC_KEY = '';
    env.NAGAD_PRIVATE_KEY = '';
    env.PAYMENT_STORE_ID = '';
    env.PAYMENT_STORE_PASSWORD = '';

    const caps = getPaymentCapabilities();
    assert.equal(caps.cod.configured, true);
    assert.equal(caps.bkash.configured, false);
    assert.equal(caps.nagad.configured, false);
    assert.equal(caps.sslcommerz.configured, false);
    assert.equal(caps.card.configured, false);
    assert.equal(caps.anyOnline, false);

    await assert.rejects(
      () =>
        initiateBkashPayment({
          orderNumber: 'NVR-100',
          transactionId: 'TXN-100',
          amount: 1000,
          currency: 'BDT',
          paymentMethod: 'bkash',
          customerName: 'A',
          customerEmail: 'a@example.com',
          customerPhone: '01700000000',
          shippingAddress: sampleShipping,
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 503 && err.code === 'PAYMENT_GATEWAY_UNCONFIGURED',
    );
  } finally {
    restoreEnvSnapshot(snap);
  }
});

test('bKash adapter performs token grant, create, execute verification, amount check, status query, and refund', async () => {
  const snap = saveEnvSnapshot();
  const origFetch = globalThis.fetch;
  clearBkashTokenCacheForTest();

  try {
    env.BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    env.BKASH_APP_KEY = 'bk_key';
    env.BKASH_APP_SECRET = 'bk_secret';
    env.BKASH_USERNAME = 'bk_user';
    env.BKASH_PASSWORD = 'bk_password';

    const calls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push(u);

      if (u.endsWith('/token/grant')) {
        return new Response(
          JSON.stringify({ id_token: 'bkash-id-tok', refresh_token: 'bkash-ref-tok', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.endsWith('/create')) {
        const body = JSON.parse(String(init?.body || '{}'));
        assert.equal(body.amount, '2500.00');
        assert.equal(body.merchantInvoiceNumber, 'TXN-BK-1');
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'TR0011PAY123',
            bkashURL: 'https://sandbox.payment.bkash.com/redirect/TR0011PAY123',
            transactionStatus: 'Initiated',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.endsWith('/execute')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'TR0011PAY123',
            trxID: 'BKA99887766',
            transactionStatus: 'Completed',
            amount: '2500.00',
            currency: 'BDT',
            merchantInvoiceNumber: 'TXN-BK-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.endsWith('/payment/status')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'TR0011PAY123',
            trxID: 'BKA99887766',
            transactionStatus: 'Completed',
            amount: '2500.00',
            currency: 'BDT',
            merchantInvoiceNumber: 'TXN-BK-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.endsWith('/payment/refund')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            refundTrxID: 'BKA-RFD-551',
            transactionStatus: 'Completed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected bKash URL: ${u}`);
    }) as typeof fetch;

    const initOut = await initiateBkashPayment({
      orderNumber: 'NVR-BK-1',
      transactionId: 'TXN-BK-1',
      amount: 2500,
      currency: 'BDT',
      paymentMethod: 'bkash',
      customerName: 'Rahim',
      customerEmail: 'rahim@example.com',
      customerPhone: '01711111111',
      shippingAddress: sampleShipping,
    });
    assert.equal(initOut.gatewayPaymentId, 'TR0011PAY123');
    assert.match(initOut.gatewayUrl, /sandbox\.payment\.bkash\.com/);

    // Execute verification passes when expectedAmount matches
    const execOk = await executeAndVerifyBkashPayment({
      transactionId: 'TXN-BK-1',
      expectedAmount: 2500,
      expectedCurrency: 'BDT',
      gatewayPaymentId: 'TR0011PAY123',
    });
    assert.equal(execOk.verified, true);
    assert.equal(execOk.gatewayTransactionId, 'BKA99887766');

    // Amount mismatch tampering fails verification!
    const execTampered = await executeAndVerifyBkashPayment({
      transactionId: 'TXN-BK-1',
      expectedAmount: 4500,
      expectedCurrency: 'BDT',
      gatewayPaymentId: 'TR0011PAY123',
    });
    assert.equal(execTampered.verified, false);
    assert.equal(execTampered.status, 'failed');

    // Token caching prevented extra /token/grant calls (only 1 grant call)
    assert.equal(calls.filter((c) => c.endsWith('/token/grant')).length, 1);

    const statusOut = await queryBkashPaymentStatus({
      transactionId: 'TXN-BK-1',
      expectedAmount: 2500,
      gatewayPaymentId: 'TR0011PAY123',
    });
    assert.equal(statusOut.verified, true);

    const refundOut = await refundBkashPayment({
      transactionId: 'TXN-BK-1',
      gatewayPaymentId: 'TR0011PAY123',
      gatewayTransactionId: 'BKA99887766',
      amount: 1000,
      reason: 'Customer partial return',
    });
    assert.equal(refundOut.success, true);
    assert.equal(refundOut.gatewayRefundId, 'BKA-RFD-551');
  } finally {
    clearBkashTokenCacheForTest();
    globalThis.fetch = origFetch;
    restoreEnvSnapshot(snap);
  }
});

test('Nagad adapter signs with RSA-SHA256, encrypts/decrypts PKCS1 payloads, and verifies merchant & amount strictly', async () => {
  const snap = saveEnvSnapshot();
  const origFetch = globalThis.fetch;

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  try {
    env.NAGAD_BASE_URL = 'https://sandbox-ssl.mynagad.com/api/dfs';
    env.NAGAD_MERCHANT_ID = '683002007104225';
    env.NAGAD_MERCHANT_NUMBER = '01700000000';
    env.NAGAD_PUBLIC_KEY = publicKey;
    env.NAGAD_PRIVATE_KEY = privateKey;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('/check-out/initialize/')) {
        const plainResp = JSON.stringify({ paymentReferenceId: 'NGD-REF-991', challenge: 'srv-ch-123' });
        const encrypted = crypto.publicEncrypt(
          { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
          Buffer.from(plainResp, 'utf8'),
        ).toString('base64');
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(plainResp, 'utf8');
        const signature = signer.sign(privateKey, 'base64');
        return new Response(JSON.stringify({ sensitiveData: encrypted, signature }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (u.includes('/check-out/complete/NGD-REF-991')) {
        return new Response(
          JSON.stringify({
            status: 'Success',
            callBackUrl: 'https://sandbox-ssl.mynagad.com/check-out/NGD-REF-991',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('/verify/payment/NGD-REF-991')) {
        return new Response(
          JSON.stringify({
            merchantId: '683002007104225',
            orderId: 'TXNNGD1',
            paymentRefId: 'NGD-REF-991',
            amount: '3200.00',
            issuerPaymentRefNo: 'ISSUER-NGD-8877',
            status: 'Success',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected Nagad URL: ${u}`);
    }) as typeof fetch;

    const init = await initiateNagadPayment({
      orderNumber: 'NVR-NGD-1',
      transactionId: 'TXN-NGD-1',
      amount: 3200,
      currency: 'BDT',
      paymentMethod: 'nagad',
      customerName: 'Karim',
      customerEmail: 'karim@example.com',
      customerPhone: '01811111111',
      shippingAddress: sampleShipping,
    });
    assert.equal(init.provider, 'nagad');
    assert.equal(init.gatewayPaymentId, 'NGD-REF-991');
    assert.match(init.gatewayUrl, /mynagad\.com/);

    const verified = await verifyNagadPayment({
      transactionId: 'TXN-NGD-1',
      expectedAmount: 3200,
      paymentRefId: 'NGD-REF-991',
    });
    assert.equal(verified.verified, true);
    assert.equal(verified.gatewayTransactionId, 'ISSUER-NGD-8877');

    // Amount mismatch blocked
    const tampered = await verifyNagadPayment({
      transactionId: 'TXN-NGD-1',
      expectedAmount: 9999,
      paymentRefId: 'NGD-REF-991',
    });
    assert.equal(tampered.verified, false);
    assert.equal(tampered.status, 'failed');
  } finally {
    globalThis.fetch = origFetch;
    restoreEnvSnapshot(snap);
  }
});

test('SSLCommerz adapter scopes card sessions, verifies MD5 IPN signature, validates server response, and issues refunds', async () => {
  const snap = saveEnvSnapshot();
  const origFetch = globalThis.fetch;

  try {
    env.PAYMENT_SANDBOX = true;
    env.PAYMENT_STORE_ID = 'novara_store';
    env.PAYMENT_STORE_PASSWORD = 'novara_secret_pw';

    let capturedFormBody = '';
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/gwprocess/v4/api.php')) {
        capturedFormBody = String(init?.body || '');
        return new Response(
          JSON.stringify({
            status: 'SUCCESS',
            GatewayPageURL: 'https://sandbox.sslcommerz.com/EasyCheckOut/sess-abc',
            sessionkey: 'sess-abc',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('/validator/api/validationserverAPI.php')) {
        return new Response(
          JSON.stringify({
            status: 'VALID',
            tran_id: 'TXN-CARD-1',
            val_id: 'VAL-555',
            amount: '5400.00',
            currency: 'BDT',
            bank_tran_id: 'BANK-4422',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('refund_amount=1400.00')) {
        return new Response(
          JSON.stringify({
            APIConnect: 'DONE',
            status: 'success',
            refund_ref_id: 'SSLR-REF-99',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected SSLCommerz URL: ${u}`);
    }) as typeof fetch;

    const session = await initiateSslCommerzSession({
      orderNumber: 'NVR-CARD-1',
      transactionId: 'TXN-CARD-1',
      amount: 5400,
      currency: 'BDT',
      paymentMethod: 'card',
      customerName: 'Nadia',
      customerEmail: 'nadia@example.com',
      customerPhone: '01911111111',
      shippingAddress: sampleShipping,
    });
    assert.match(session.gatewayUrl, /sandbox\.sslcommerz\.com/);
    assert.match(capturedFormBody, /multi_card_name=visacard/);

    // Verify authentic MD5 verify_sign generation & validation
    const storePassMd5 = crypto.createHash('md5').update(env.PAYMENT_STORE_PASSWORD).digest('hex');
    const signedRaw = `amount=5400.00&status=VALID&store_passwd=${storePassMd5}&tran_id=TXN-CARD-1`;
    const verifySign = crypto.createHash('md5').update(signedRaw).digest('hex');
    assert.equal(
      verifySslCommerzIpnSignature({
        amount: '5400.00',
        status: 'VALID',
        tran_id: 'TXN-CARD-1',
        verify_key: 'amount,status,tran_id',
        verify_sign: verifySign,
      }),
      true,
    );
    assert.equal(
      verifySslCommerzIpnSignature({
        amount: '5400.00',
        status: 'VALID',
        tran_id: 'TXN-CARD-1',
        verify_key: 'amount,status,tran_id',
        verify_sign: '0'.repeat(32),
      }),
      false,
    );

    const verifyOut = await verifySslCommerzPayment({
      transactionId: 'TXN-CARD-1',
      expectedAmount: 5400,
      gatewayValidationId: 'VAL-555',
    });
    assert.equal(verifyOut.verified, true);
    assert.equal(verifyOut.bankTransactionId, 'BANK-4422');

    const refundOut = await refundSslCommerzPayment({
      transactionId: 'TXN-CARD-1',
      bankTransactionId: 'BANK-4422',
      amount: 1400,
      reason: 'Partial refund for accessory',
    });
    assert.equal(refundOut.success, true);
    assert.equal(refundOut.gatewayRefundId, 'SSLR-REF-99');
  } finally {
    globalThis.fetch = origFetch;
    restoreEnvSnapshot(snap);
  }
});

test('Payment orchestrator enforces anti-replay, verified-only cart clearing, stock re-reservation on retry, and refund boundaries', async () => {
  const snap = saveEnvSnapshot();
  const origFetch = globalThis.fetch;

  const origTxFindOne = PaymentTransactionModel.findOne;
  const origTxFindOneAndUpdate = PaymentTransactionModel.findOneAndUpdate;
  const origTxUpdateMany = PaymentTransactionModel.updateMany;
  const origTxCreate = PaymentTransactionModel.create;
  const origOrderFindById = OrderModel.findById;
  const origOrderFindOne = OrderModel.findOne;
  const origCartFindOne = CartModel.findOne;
  const origProdFindById = ProductModel.findById;
  const origProdFindOne = ProductModel.findOne;
  const origProdFindOneAndUpdate = ProductModel.findOneAndUpdate;
  const origCmsFindOne = HomepageConfigModel.findOne;
  const origInvCreate = InventoryMovementModel.create;
  const origSysCreate = SystemLogModel.create;
  const origAuditCreate = AuditLogModel.create;

  clearBkashTokenCacheForTest();

  try {
    env.BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    env.BKASH_APP_KEY = 'bk_key';
    env.BKASH_APP_SECRET = 'bk_secret';
    env.BKASH_USERNAME = 'bk_user';
    env.BKASH_PASSWORD = 'bk_password';

    SystemLogModel.create = (async () => ({})) as never;
    AuditLogModel.create = (async () => ({})) as never;
    InventoryMovementModel.create = (async () => ({})) as never;

    // 1. Duplicate/replay gatewayTransactionId is rejected even if gateway says Completed
    const txDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439101',
      orderId: '507f1f77bcf86cd799439102',
      orderNumber: 'NVR-REPLAY-1',
      userId: 'user-1',
      provider: 'bkash',
      paymentMethod: 'bkash',
      transactionId: 'TXN-REPLAY-1',
      amount: 1500,
      requestedAmount: 1500,
      currency: 'BDT',
      status: 'initiated',
      gatewayPaymentId: 'PAY-REPLAY-1',
      webhookEvents: [] as unknown[],
      refunds: [] as unknown[],
      save: async () => undefined,
      toObject: () => txDoc,
    };
    const orderDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439102',
      orderNumber: 'NVR-REPLAY-1',
      userId: 'user-1',
      customerName: 'Test Customer',
      customerEmail: 'cust@example.com',
      customerPhone: '01711111111',
      orderStatus: 'pending',
      paymentStatus: 'initiated',
      fulfillmentStatus: 'unfulfilled',
      paymentMethod: 'bkash',
      total: 1500,
      items: [{ productId: 'prod-1', variantId: null, quantity: 1, sku: 'SKU-1', name: 'Gadget' }],
      shippingAddress: sampleShipping,
      statusHistory: [] as unknown[],
      staffNotes: [] as unknown[],
      save: async () => undefined,
      toObject: () => orderDoc,
    };

    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/token/grant')) {
        return new Response(JSON.stringify({ id_token: 'tok-1', expires_in: 3600 }), { status: 200 });
      }
      if (u.endsWith('/execute')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'PAY-REPLAY-1',
            trxID: 'DUP-TRX-999',
            transactionStatus: 'Completed',
            amount: '1500.00',
            currency: 'BDT',
            merchantInvoiceNumber: 'TXN-REPLAY-1',
          }),
          { status: 200 },
        );
      }
      if (u.endsWith('/create')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'PAY-RETRY-2',
            bkashURL: 'https://sandbox.payment.bkash.com/redirect/PAY-RETRY-2',
          }),
          { status: 200 },
        );
      }
      if (u.endsWith('/payment/refund')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            refundTrxID: 'RFD-BKA-01',
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch URL: ${u}`);
    }) as typeof fetch;

    let findOneCall = 0;
    PaymentTransactionModel.findOne = ((q: Record<string, unknown>) => {
      findOneCall += 1;
      if (q.$or) {
        // Anti-replay duplicate query finds an already-claimed paid transaction!
        return { lean: async () => ({ transactionId: 'TXN-OLDER', gatewayTransactionId: 'DUP-TRX-999' }) };
      }
      return txDoc;
    }) as never;
    PaymentTransactionModel.findOneAndUpdate = (async () => txDoc) as never;
    OrderModel.findById = (async () => orderDoc) as never;
    ProductModel.findById = (() => ({ select: () => ({ lean: async () => ({ manageInventory: true }) }) })) as never;
    ProductModel.updateOne = (async () => ({ modifiedCount: 1 })) as never;

    let cartSavedOnFail = false;
    CartModel.findOne = (async () => ({
      items: [{ productId: 'prod-1', variantId: null }],
      save: async () => {
        cartSavedOnFail = true;
      },
    })) as never;

    const replayOut = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: 'TXN-REPLAY-1',
      paymentId: 'PAY-REPLAY-1',
      source: 'callback',
    });
    assert.equal(replayOut.status, 'failed');
    assert.match(replayOut.reason || '', /replay blocked/i);
    assert.equal(cartSavedOnFail, false, 'Cart must remain intact when verification fails');

    // 2. Clean verification clears cart & confirms order
    txDoc.status = 'initiated';
    orderDoc.orderStatus = 'pending';
    orderDoc.paymentStatus = 'initiated';
    PaymentTransactionModel.findOne = ((q: Record<string, unknown>) => {
      if (q.$or) return { lean: async () => null };
      return txDoc;
    }) as never;

    let cartItemsAfterPaid = 99;
    CartModel.findOne = (async () => {
      const cart = {
        items: [
          { productId: 'prod-1', variantId: null },
          { productId: 'prod-other', variantId: null },
        ],
        couponCode: 'SAVE10',
        save: async () => {
          cartItemsAfterPaid = cart.items.length;
        },
      };
      return cart;
    }) as never;

    const paidOut = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: 'TXN-REPLAY-1',
      paymentId: 'PAY-REPLAY-1',
      source: 'callback',
    });
    assert.equal(paidOut.status, 'paid');
    assert.equal(orderDoc.orderStatus, 'confirmed');
    assert.equal(orderDoc.paymentStatus, 'paid');
    assert.equal(cartItemsAfterPaid, 1, 'Only purchased items are cleared from cart after verified payment');

    // 3. Over-refund is rejected
    await assert.rejects(
      () =>
        refundPaymentTransactionAdmin({
          idOrTranId: '507f1f77bcf86cd799439101',
          amount: 2000,
          reason: 'Exceeds paid total',
          actor: { _id: 'adm-1', name: 'Finance Admin', role: 'admin' } as never,
        }),
      (err: { code?: string; statusCode?: number }) => err.statusCode === 400 && err.code === 'INVALID_REFUND_AMOUNT',
    );

    // Partial refund succeeds & transitions to partially_refunded
    const partialRefund = await refundPaymentTransactionAdmin({
      idOrTranId: '507f1f77bcf86cd799439101',
      amount: 500,
      reason: 'Missing cable partial refund',
      actor: { _id: 'adm-1', name: 'Finance Admin', role: 'admin' } as never,
    });
    assert.equal(partialRefund.status, 'partially_refunded');
    assert.equal(partialRefund.gatewayRefundId, 'RFD-BKA-01');

    // 4. Retry payment on cancelled online order re-reserves stock & initiates new session
    orderDoc.orderStatus = 'cancelled';
    orderDoc.paymentStatus = 'cancelled';
    OrderModel.findOne = (async () => orderDoc) as never;
    HomepageConfigModel.findOne = (() => ({ lean: async () => ({ paymentMethods: { bkashEnabled: true } }) })) as never;
    ProductModel.findOne = (async () => ({ _id: 'prod-1', name: 'Gadget', manageInventory: true, allowBackorder: false })) as never;
    ProductModel.findOneAndUpdate = (async () => ({ _id: 'prod-1' })) as never;
    PaymentTransactionModel.updateMany = (async () => ({ modifiedCount: 1 })) as never;
    PaymentTransactionModel.create = (async (doc: Record<string, unknown>) => ({
      ...doc,
      _id: 'tx-retry-2',
      save: async () => undefined,
      toObject: () => ({ ...doc, _id: 'tx-retry-2' }),
    })) as never;

    const retryOut = await retryOrderPaymentForCustomer({
      orderId: '507f1f77bcf86cd799439102',
      userId: 'user-1',
      paymentMethod: 'bkash',
    });
    assert.match(retryOut.gatewayUrl, /PAY-RETRY-2/);
    assert.equal(orderDoc.orderStatus, 'pending');
    assert.equal(orderDoc.paymentStatus, 'initiated');

    // 5. Nagad transaction refund returns 422 GATEWAY_REFUND_UNSUPPORTED honestly
    const nagadTx = {
      ...txDoc,
      provider: 'nagad',
      status: 'paid',
      amount: 1500,
      refundedAmount: 0,
      refunds: [],
    };
    PaymentTransactionModel.findOne = (async () => nagadTx) as never;
    await assert.rejects(
      () =>
        refundPaymentTransactionAdmin({
          idOrTranId: '507f1f77bcf86cd799439101',
          amount: 500,
          reason: 'Refund attempt',
          actor: { _id: 'adm-1', name: 'Finance Admin', role: 'admin' } as never,
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 422 && err.code === 'GATEWAY_REFUND_UNSUPPORTED',
    );
    assert.ok(findOneCall > 0);
  } finally {
    clearBkashTokenCacheForTest();
    globalThis.fetch = origFetch;
    PaymentTransactionModel.findOne = origTxFindOne;
    PaymentTransactionModel.findOneAndUpdate = origTxFindOneAndUpdate;
    PaymentTransactionModel.updateMany = origTxUpdateMany;
    PaymentTransactionModel.create = origTxCreate;
    OrderModel.findById = origOrderFindById;
    OrderModel.findOne = origOrderFindOne;
    CartModel.findOne = origCartFindOne;
    ProductModel.findById = origProdFindById;
    ProductModel.findOne = origProdFindOne;
    ProductModel.findOneAndUpdate = origProdFindOneAndUpdate;
    HomepageConfigModel.findOne = origCmsFindOne;
    InventoryMovementModel.create = origInvCreate;
    SystemLogModel.create = origSysCreate;
    AuditLogModel.create = origAuditCreate;
    restoreEnvSnapshot(snap);
  }
});

test('markPaymentFailedOrCancelled marks pending order cancelled & releases reserved stock without touching paid orders', async () => {
  const origTxFindOne = PaymentTransactionModel.findOne;
  const origOrderFindById = OrderModel.findById;
  const origProdFindById = ProductModel.findById;
  const origProdUpdateOne = ProductModel.updateOne;
  const origInvCreate = InventoryMovementModel.create;
  const origSysCreate = SystemLogModel.create;

  try {
    SystemLogModel.create = (async () => ({})) as never;
    InventoryMovementModel.create = (async () => ({})) as never;
    ProductModel.findById = (() => ({ select: () => ({ lean: async () => ({ manageInventory: true }) }) })) as never;
    let releasedCount = 0;
    ProductModel.updateOne = (async () => {
      releasedCount += 1;
      return { modifiedCount: 1 };
    }) as never;

    const txDoc = {
      orderId: 'ord-cancel-1',
      orderNumber: 'NVR-CANCEL-1',
      transactionId: 'TXN-CANCEL-1',
      provider: 'sslcommerz',
      status: 'initiated',
      webhookEvents: [] as unknown[],
      save: async () => undefined,
    };
    const orderDoc = {
      _id: 'ord-cancel-1',
      orderNumber: 'NVR-CANCEL-1',
      orderStatus: 'pending',
      paymentStatus: 'initiated',
      fulfillmentStatus: 'unfulfilled',
      items: [{ productId: 'p1', variantId: null, quantity: 2, sku: 'S1', name: 'Laptop' }],
      statusHistory: [] as unknown[],
      save: async () => undefined,
    };
    PaymentTransactionModel.findOne = (async () => txDoc) as never;
    OrderModel.findById = (async () => orderDoc) as never;

    const res = await markPaymentFailedOrCancelled({
      tranId: 'TXN-CANCEL-1',
      outcome: 'cancelled',
      reason: 'Customer cancelled at gateway',
      source: 'callback',
    });
    assert.equal(res.status, 'cancelled');
    assert.equal(orderDoc.paymentStatus, 'cancelled');
    assert.equal(orderDoc.orderStatus, 'cancelled');
    assert.equal(releasedCount, 1);

    // Paid transactions cannot be overwritten to failed/cancelled
    txDoc.status = 'paid';
    const paidGuard = await markPaymentFailedOrCancelled({
      tranId: 'TXN-CANCEL-1',
      outcome: 'failed',
      reason: 'Delayed failure webhook',
      source: 'webhook',
    });
    assert.equal(paidGuard.status, 'already_paid');
  } finally {
    PaymentTransactionModel.findOne = origTxFindOne;
    OrderModel.findById = origOrderFindById;
    ProductModel.findById = origProdFindById;
    ProductModel.updateOne = origProdUpdateOne;
    InventoryMovementModel.create = origInvCreate;
    SystemLogModel.create = origSysCreate;
  }
});

test('Audit fixes: concurrent callback lock, bKash 401 auto-refresh & Authorized capture, Nagad orderId check, delayed payment reconciliation, and admin refund guards', async () => {
  const http = await import('node:http');
  const mongoose = (await import('mongoose')).default;
  const { createExpressApp } = await import('../app');
  const { signAuthToken } = await import('../middleware/auth.middleware');
  const { UserModel } = await import('../modules/users/user.model');
  const { updateOrderPaymentStatusAdmin } = await import('../modules/orders/order.admin.service');

  const snap = saveEnvSnapshot();
  const origFetch = globalThis.fetch;
  const origTxFindOne = PaymentTransactionModel.findOne;
  const origTxFindById = PaymentTransactionModel.findById;
  const origTxFindOneAndUpdate = PaymentTransactionModel.findOneAndUpdate;
  const origOrderFindById = OrderModel.findById;
  const origOrderFindOne = OrderModel.findOne;
  const origCartFindOne = CartModel.findOne;
  const origProdFindOne = ProductModel.findOne;
  const origProdFindOneAndUpdate = ProductModel.findOneAndUpdate;
  const origUserFindById = UserModel.findById;
  const origSysCreate = SystemLogModel.create;
  const origAuditCreate = AuditLogModel.create;

  const readyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

  clearBkashTokenCacheForTest();

  try {
    env.BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    env.BKASH_APP_KEY = 'bk_key';
    env.BKASH_APP_SECRET = 'bk_secret';
    env.BKASH_USERNAME = 'bk_user';
    env.BKASH_PASSWORD = 'bk_password';
    env.NAGAD_BASE_URL = 'https://sandbox-ssl.mynagad.com/api/dfs';
    env.NAGAD_MERCHANT_ID = '683002007104225';
    env.NAGAD_MERCHANT_NUMBER = '01700000000';
    env.NAGAD_PUBLIC_KEY = 'pub';
    env.NAGAD_PRIVATE_KEY = 'priv';
    env.PAYMENT_SANDBOX = true;
    env.PAYMENT_STORE_ID = 'novara_store';
    env.PAYMENT_STORE_PASSWORD = 'novara_secret_pw';
    env.PAYMENT_WEBHOOK_SECRET = 'wh_secret_123';

    SystemLogModel.create = (async () => ({})) as never;
    AuditLogModel.create = (async () => ({})) as never;
    CartModel.findOne = (async () => null) as never;

    // 1. Nagad cross-order substitution rejected
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          merchantId: '683002007104225',
          orderId: 'WRONGORDER999',
          paymentRefId: 'NGD-REF-1',
          amount: '1500.00',
          status: 'Success',
        }),
        { status: 200 },
      )) as typeof fetch;

    const nagadMismatch = await verifyNagadPayment({
      transactionId: 'TXN-NGD-100',
      expectedAmount: 1500,
      paymentRefId: 'NGD-REF-1',
    });
    assert.equal(nagadMismatch.verified, false);
    assert.match(nagadMismatch.failureReason || '', /orderId mismatch/i);

    // 2. bKash 401 triggers single token refresh + retry, and Authorized status triggers execute
    let grantCalls = 0;
    let executeCalls = 0;
    let createCalls = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/token/grant')) {
        grantCalls += 1;
        return new Response(
          JSON.stringify({ id_token: `tok-${grantCalls}`, expires_in: 3600 }),
          { status: 200 },
        );
      }
      if (u.endsWith('/create')) {
        createCalls += 1;
        if (createCalls === 1) {
          return new Response(JSON.stringify({ statusMessage: 'Unauthorized' }), { status: 401 });
        }
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'BK-PAY-401',
            bkashURL: 'https://sandbox.payment.bkash.com/redirect/BK-PAY-401',
          }),
          { status: 200 },
        );
      }
      if (u.endsWith('/payment/status')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'BK-PAY-401',
            transactionStatus: 'Authorized',
            amount: '1800.00',
            currency: 'BDT',
            merchantInvoiceNumber: 'TXN-BK-CONC-1',
          }),
          { status: 200 },
        );
      }
      if (u.endsWith('/execute')) {
        executeCalls += 1;
        await new Promise((r) => setTimeout(r, 25));
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'BK-PAY-401',
            trxID: 'BKA-TRX-CONC-1',
            transactionStatus: 'Completed',
            amount: '1800.00',
            currency: 'BDT',
            merchantInvoiceNumber: 'TXN-BK-CONC-1',
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected bKash URL: ${u}`);
    }) as typeof fetch;

    const bkInitAfter401 = await initiateBkashPayment({
      orderNumber: 'NVR-401',
      transactionId: 'TXN-401',
      amount: 1800,
      currency: 'BDT',
      paymentMethod: 'bkash',
      customerName: 'User',
      customerEmail: 'u@example.com',
      customerPhone: '01700000000',
      shippingAddress: sampleShipping,
    });
    assert.equal(bkInitAfter401.gatewayPaymentId, 'BK-PAY-401');
    assert.equal(grantCalls, 2);
    assert.equal(createCalls, 2);

    // 3. Concurrent verifyAndFinalizePayment race with realistic processingLockAt lease + Authorized auto-execute
    const txRaceDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439201',
      orderId: '507f1f77bcf86cd799439202',
      orderNumber: 'NVR-CONC-1',
      userId: '507f1f77bcf86cd799439299',
      provider: 'bkash',
      paymentMethod: 'bkash',
      transactionId: 'TXN-BK-CONC-1',
      amount: 1800,
      requestedAmount: 1800,
      currency: 'BDT',
      status: 'initiated',
      gatewayPaymentId: 'BK-PAY-401',
      processingLockAt: null as Date | null,
      webhookEvents: [] as unknown[],
      refunds: [] as unknown[],
      save: async () => undefined,
      toObject: () => txRaceDoc,
    };
    const orderRaceDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439202',
      orderNumber: 'NVR-CONC-1',
      userId: '507f1f77bcf86cd799439299',
      customerName: 'Race User',
      customerEmail: 'race@example.com',
      customerPhone: '01711111111',
      orderStatus: 'pending',
      paymentStatus: 'initiated',
      fulfillmentStatus: 'unfulfilled',
      paymentMethod: 'bkash',
      total: 1800,
      items: [{ productId: 'prod-race-1', variantId: null, quantity: 1, sku: 'SKU-R', name: 'Watch' }],
      shippingAddress: sampleShipping,
      statusHistory: [] as unknown[],
      staffNotes: [] as unknown[],
      save: async () => undefined,
      toObject: () => orderRaceDoc,
    };

    PaymentTransactionModel.findOne = ((q: Record<string, unknown>) => {
      if (q.$or) return { lean: async () => null };
      if (q.transactionId === 'TXN-BK-CONC-1') return txRaceDoc;
      return null;
    }) as never;
    PaymentTransactionModel.findById = (() => ({ lean: async () => ({ ...txRaceDoc }) })) as never;
    PaymentTransactionModel.findOneAndUpdate = (async (_filter: unknown, update: { $set?: Record<string, unknown> }) => {
      if (
        !txRaceDoc.processingLockAt &&
        ['initiated', 'pending', 'authorized', 'expired'].includes(String(txRaceDoc.status))
      ) {
        txRaceDoc.status = update.$set?.status || 'pending';
        txRaceDoc.processingLockAt = (update.$set?.processingLockAt as Date) || new Date();
        return txRaceDoc;
      }
      return null;
    }) as never;
    OrderModel.findById = (async () => orderRaceDoc) as never;

    const [raceA, raceB] = await Promise.all([
      verifyAndFinalizePayment({ provider: 'bkash', tranId: 'TXN-BK-CONC-1', source: 'poll' }),
      verifyAndFinalizePayment({ provider: 'bkash', tranId: 'TXN-BK-CONC-1', source: 'reconcile' }),
    ]);
    assert.equal(executeCalls, 1, 'Atomic processingLockAt must ensure bKash execute runs only once');
    const statuses = [raceA.status, raceB.status].sort();
    assert.deepEqual(statuses, ['paid', 'pending']);
    assert.equal(txRaceDoc.processingLockAt, null);

    // 4. Delayed verified payment on previously cancelled order re-reserves stock or marks refund_pending
    txRaceDoc.status = 'expired';
    txRaceDoc.processingLockAt = null;
    orderRaceDoc.orderStatus = 'cancelled';
    orderRaceDoc.paymentStatus = 'expired';
    ProductModel.findOne = (async () => ({ _id: 'prod-race-1', name: 'Watch', manageInventory: true, allowBackorder: false })) as never;
    ProductModel.findOneAndUpdate = (async () => null) as never; // Out of stock!

    const outOfStockDelayed = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: 'TXN-BK-CONC-1',
      paymentId: 'BK-PAY-401',
      source: 'callback',
    });
    assert.equal(outOfStockDelayed.status, 'failed');
    assert.equal(txRaceDoc.status, 'refund_pending');
    assert.equal(orderRaceDoc.paymentStatus, 'refund_pending');
    assert.equal(orderRaceDoc.orderStatus, 'cancelled');

    // Now simulate stock available -> re-reserves and reopens to confirmed
    txRaceDoc.status = 'expired';
    txRaceDoc.processingLockAt = null;
    orderRaceDoc.orderStatus = 'cancelled';
    orderRaceDoc.paymentStatus = 'expired';
    ProductModel.findOneAndUpdate = (async () => ({ _id: 'prod-race-1' })) as never;

    const restockedDelayed = await verifyAndFinalizePayment({
      provider: 'bkash',
      tranId: 'TXN-BK-CONC-1',
      paymentId: 'BK-PAY-401',
      source: 'callback',
    });
    assert.equal(restockedDelayed.status, 'paid');
    assert.equal(orderRaceDoc.orderStatus, 'confirmed');
    assert.equal(orderRaceDoc.paymentStatus, 'paid');

    // 5. Admin manual online refund bypass is blocked for bKash, requires portal note for Nagad
    const bkashOrderDoc = {
      _id: '507f1f77bcf86cd799439205',
      orderNumber: 'NVR-ADM-1',
      paymentMethod: 'bkash',
      paymentStatus: 'paid',
      total: 1800,
      staffNotes: [] as unknown[],
      save: async () => undefined,
      toObject: () => bkashOrderDoc,
    };
    OrderModel.findById = (async () => bkashOrderDoc) as never;
    PaymentTransactionModel.findOne = (() => ({ lean: async () => null })) as never;

    await assert.rejects(
      () => updateOrderPaymentStatusAdmin({ id: '507f1f77bcf86cd799439205', paymentStatus: 'refunded', actorName: 'Admin' }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'GATEWAY_REFUND_REQUIRED',
    );

    // 6. End-to-end Express HTTP verification for IPN signature, webhook spoofing, status ownership, & refund RBAC
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const customerUser = {
      _id: '507f1f77bcf86cd799439299',
      name: 'Customer',
      email: 'cust@example.com',
      role: 'customer',
      status: 'active',
    };
    const staffNoRefund = {
      _id: '507f1f77bcf86cd799439288',
      name: 'Support Rep',
      email: 'support@example.com',
      role: 'support',
      status: 'active',
      permissions: ['orders.view'],
    };

    UserModel.findById = (async (id: string) =>
      String(id) === customerUser._id ? customerUser : staffNoRefund) as never;

    const sslTxDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439211',
      orderId: '507f1f77bcf86cd799439212',
      orderNumber: 'NVR-SSL-HTTP-1',
      userId: customerUser._id,
      provider: 'sslcommerz',
      paymentMethod: 'card',
      transactionId: 'TXN-SSL-HTTP-1',
      amount: 2200,
      requestedAmount: 2200,
      currency: 'BDT',
      status: 'initiated',
      gatewayPaymentId: undefined,
      processingLockAt: null,
      webhookEvents: [] as unknown[],
      refunds: [] as unknown[],
      save: async () => undefined,
      toObject: () => sslTxDoc,
    };
    const sslOrderDoc: Record<string, unknown> = {
      _id: '507f1f77bcf86cd799439212',
      orderNumber: 'NVR-SSL-HTTP-1',
      userId: customerUser._id,
      customerName: 'Customer',
      customerEmail: 'cust@example.com',
      customerPhone: '01711111111',
      orderStatus: 'pending',
      paymentStatus: 'initiated',
      fulfillmentStatus: 'unfulfilled',
      paymentMethod: 'card',
      total: 2200,
      items: [],
      shippingAddress: sampleShipping,
      statusHistory: [] as unknown[],
      staffNotes: [] as unknown[],
      save: async () => undefined,
      toObject: () => sslOrderDoc,
    };

    PaymentTransactionModel.findOne = ((q: Record<string, unknown>) => {
      if (q.$or) return { lean: async () => null };
      if (q.transactionId === 'TXN-SSL-HTTP-1') return { ...sslTxDoc, lean: async () => sslTxDoc, ...sslTxDoc };
      if (q.transactionId === 'TXN-BK-HTTP-1') return { ...txRaceDoc, lean: async () => txRaceDoc, ...txRaceDoc };
      return { lean: async () => null };
    }) as never;
    PaymentTransactionModel.findById = (() => Object.assign(Promise.resolve(sslTxDoc), { lean: async () => sslTxDoc })) as never;
    PaymentTransactionModel.findOneAndUpdate = (async () => sslTxDoc) as never;
    OrderModel.findById = (() => Object.assign(Promise.resolve(sslOrderDoc), { lean: async () => sslOrderDoc })) as never;
    OrderModel.findOne = ((q: Record<string, unknown>) => ({
      lean: async () => (String(q.userId) === customerUser._id ? sslOrderDoc : null),
    })) as never;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('merchantTransIDvalidationAPI.php')) {
        return new Response(JSON.stringify({ status: 'PENDING', no_of_trans_found: 0 }), { status: 200 });
      }
      if (u.includes('validationserverAPI.php')) {
        return new Response(
          JSON.stringify({
            status: 'VALID',
            tran_id: 'TXN-SSL-HTTP-1',
            val_id: 'VAL-HTTP-1',
            amount: '2200.00',
            currency: 'BDT',
            bank_tran_id: 'BANK-HTTP-1',
          }),
          { status: 200 },
        );
      }
      if (u.includes('/payment/status')) {
        return new Response(
          JSON.stringify({
            statusCode: '0000',
            paymentID: 'BK-PAY-401',
            transactionStatus: 'Initiated',
          }),
          { status: 200 },
        );
      }
      if (u.endsWith('/token/grant')) {
        return new Response(JSON.stringify({ id_token: 'tok-http', expires_in: 3600 }), { status: 200 });
      }
      throw new Error(`Unexpected fetch in HTTP test: ${u}`);
    }) as typeof fetch;

    const app = createExpressApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // Unauthenticated GET cancel does NOT cancel pending order when gateway reports PENDING
      const cancelGetRes = await origFetch(`${base}/api/payments/callback/sslcommerz/cancel?tran_id=TXN-SSL-HTTP-1`, {
        redirect: 'manual',
      });
      assert.equal(cancelGetRes.status, 302);
      assert.equal(sslOrderDoc.orderStatus, 'pending');

      // Forged IPN without verify_sign is rejected 400 INVALID_SIGNATURE
      const forgedIpn = await origFetch(`${base}/api/payments/ipn/sslcommerz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: 'TXN-SSL-HTTP-1', status: 'FAILED' }),
      });
      assert.equal(forgedIpn.status, 400);
      const forgedBody = (await forgedIpn.json()) as { code?: string };
      assert.equal(forgedBody.code, 'INVALID_SIGNATURE');
      assert.equal(sslOrderDoc.orderStatus, 'pending');

      // Forged webhook cancel with wrong secret returns 401
      const badSecretWebhook = await origFetch(`${base}/api/payments/webhook/bkash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'wrong' },
        body: JSON.stringify({ tran_id: 'TXN-BK-HTTP-1', status: 'cancelled' }),
      });
      assert.equal(badSecretWebhook.status, 401);

      // Forged webhook cancel without secret cannot blindly cancel pending bKash tx (queries gateway -> stays pending)
      txRaceDoc.status = 'initiated';
      txRaceDoc.processingLockAt = null;
      txRaceDoc.transactionId = 'TXN-BK-HTTP-1';
      orderRaceDoc.orderStatus = 'pending';
      PaymentTransactionModel.findOneAndUpdate = (async () => txRaceDoc) as never;
      OrderModel.findById = (async () => orderRaceDoc) as never;
      const forgedBkashWebhook = await origFetch(`${base}/api/payments/webhook/bkash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: 'TXN-BK-HTTP-1', status: 'cancelled' }),
      });
      assert.equal(forgedBkashWebhook.status, 200);
      const bkWhJson = (await forgedBkashWebhook.json()) as { result: { status: string } };
      assert.equal(bkWhJson.result.status, 'pending');
      assert.equal(orderRaceDoc.orderStatus, 'pending');

      // Signed SSLCommerz IPN verifies & marks order confirmed + paid
      PaymentTransactionModel.findOneAndUpdate = (async () => sslTxDoc) as never;
      OrderModel.findById = (() => Object.assign(Promise.resolve(sslOrderDoc), { lean: async () => sslOrderDoc })) as never;
      const storePassMd5 = crypto.createHash('md5').update(env.PAYMENT_STORE_PASSWORD).digest('hex');
      const signedStr = `amount=2200.00&status=VALID&store_passwd=${storePassMd5}&tran_id=TXN-SSL-HTTP-1&val_id=VAL-HTTP-1`;
      const verifySign = crypto.createHash('md5').update(signedStr).digest('hex');
      const validIpn = await origFetch(`${base}/api/payments/ipn/sslcommerz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tran_id: 'TXN-SSL-HTTP-1',
          val_id: 'VAL-HTTP-1',
          amount: '2200.00',
          status: 'VALID',
          verify_key: 'amount,status,tran_id,val_id',
          verify_sign: verifySign,
        }),
      });
      assert.equal(validIpn.status, 200);
      const ipnBody = (await validIpn.json()) as { result: { status: string } };
      assert.equal(ipnBody.result.status, 'paid');
      assert.equal(sslOrderDoc.orderStatus, 'confirmed');
      assert.equal(sslOrderDoc.paymentStatus, 'paid');

      // Status polling auth + ownership + RBAC on refund route
      const custToken = signAuthToken(customerUser as never);
      const staffToken = signAuthToken(staffNoRefund as never);

      const unauthStatus = await origFetch(`${base}/api/payments/TXN-SSL-HTTP-1/status`);
      assert.equal(unauthStatus.status, 401);

      const authStatus = await origFetch(`${base}/api/payments/TXN-SSL-HTTP-1/status`, {
        headers: { Authorization: `Bearer ${custToken}` },
      });
      assert.equal(authStatus.status, 200);

      const forbiddenRefund = await origFetch(`${base}/api/admin/payments/TXN-SSL-HTTP-1/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ reason: 'Unauthorized attempt' }),
      });
      assert.equal(forbiddenRefund.status, 403);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  } finally {
    clearBkashTokenCacheForTest();
    globalThis.fetch = origFetch;
    PaymentTransactionModel.findOne = origTxFindOne;
    PaymentTransactionModel.findById = origTxFindById;
    PaymentTransactionModel.findOneAndUpdate = origTxFindOneAndUpdate;
    OrderModel.findById = origOrderFindById;
    OrderModel.findOne = origOrderFindOne;
    CartModel.findOne = origCartFindOne;
    ProductModel.findOne = origProdFindOne;
    ProductModel.findOneAndUpdate = origProdFindOneAndUpdate;
    UserModel.findById = origUserFindById;
    SystemLogModel.create = origSysCreate;
    AuditLogModel.create = origAuditCreate;
    if (readyDesc) {
      Object.defineProperty(mongoose.connection, 'readyState', readyDesc);
    }
    restoreEnvSnapshot(snap);
  }
});
