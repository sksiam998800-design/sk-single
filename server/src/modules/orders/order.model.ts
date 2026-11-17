import mongoose, { Schema, type Document } from 'mongoose';
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from '../../../../src/lib/orderStateMachine';

export interface IOrderItemSnapshot {
  productId: mongoose.Types.ObjectId;
  variantId?: string | null;
  sku: string;
  name: string;
  slug: string;
  imageUrl: string;
  variantOptions?: Record<string, string>;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  lineTotal: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItemSnapshot[];
  shippingAddress: {
    recipientName: string;
    email?: string;
    phone: string;
    division: string;
    district: string;
    upazila: string;
    area: string;
    house: string;
    road?: string;
    landmark?: string;
    postalCode?: string;
    deliveryInstructions?: string;
  };
  deliveryMethod: 'standard' | 'express';
  deliveryOptionCode?: string;
  deliveryMethodName?: string;
  deliveryEta?: string;
  shippingZone: string;
  couponCode?: string | null;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: Date | null;
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  courierName?: string;
  trackingNumber?: string;
  cancellationReason?: string;
  idempotencyKey?: string;
  deliveredAt?: Date;
  statusHistory: Array<{
    fromStatus?: string;
    toStatus: string;
    actorId?: mongoose.Types.ObjectId | null;
    actorName: string;
    reason?: string;
    timestamp: Date;
  }>;
  staffNotes: Array<{
    note: string;
    actorName: string;
    timestamp: Date;
  }>;
  cancellationRequest?: {
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    message?: string;
    requestedBy?: mongoose.Types.ObjectId | null;
    requestedAt: Date;
    reviewedBy?: mongoose.Types.ObjectId | null;
    reviewedByName?: string;
    reviewedAt?: Date | null;
    adminNotes?: string;
  } | null;
  cancellationHistory: Array<{
    action: 'direct_cancel' | 'requested' | 'approved' | 'rejected';
    actorId?: mongoose.Types.ObjectId | null;
    actorName: string;
    reason?: string;
    message?: string;
    adminNotes?: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          variantId: { type: String, default: null },
          sku: { type: String, required: true },
          name: { type: String, required: true },
          slug: { type: String, required: true },
          imageUrl: { type: String, default: '' },
          variantOptions: { type: Map, of: String, default: {} },
          quantity: { type: Number, required: true, min: 1 },
          unitPrice: { type: Number, required: true, min: 0 },
          originalPrice: { type: Number, default: null },
          lineTotal: { type: Number, required: true, min: 0 },
        },
      ],
      required: true,
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      email: { type: String },
      phone: { type: String, required: true },
      division: { type: String, required: true },
      district: { type: String, required: true },
      upazila: { type: String, required: true },
      area: { type: String, required: true },
      house: { type: String, required: true },
      road: { type: String },
      landmark: { type: String },
      postalCode: { type: String },
      deliveryInstructions: { type: String },
    },
    deliveryMethod: { type: String, enum: ['standard', 'express'], default: 'standard' },
    deliveryOptionCode: { type: String, default: 'standard' },
    deliveryMethodName: { type: String, default: 'Standard Delivery' },
    deliveryEta: { type: String, default: 'Within 2–5 Business Days' },
    shippingZone: { type: String, default: 'nationwide' },
    couponCode: { type: String, default: null },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    shippingCharge: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cod', 'sslcommerz', 'bkash', 'nagad', 'card'], required: true },
    paymentStatus: {
      type: String,
      enum: [
        'unpaid',
        'initiated',
        'pending',
        'authorized',
        'paid',
        'failed',
        'cancelled',
        'expired',
        'refund_pending',
        'partially_refunded',
        'refunded',
      ],
      default: 'unpaid',
      index: true,
    },
    paidAt: { type: Date, default: null },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'],
      default: 'pending',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['unfulfilled', 'packing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'unfulfilled',
    },
    courierName: { type: String },
    trackingNumber: { type: String },
    cancellationReason: { type: String },
    idempotencyKey: { type: String, sparse: true },
    deliveredAt: { type: Date },
    statusHistory: {
      type: [
        {
          fromStatus: { type: String },
          toStatus: { type: String, required: true },
          actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          actorName: { type: String, required: true },
          reason: { type: String },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    staffNotes: {
      type: [
        {
          note: { type: String, required: true },
          actorName: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    cancellationRequest: {
      type: {
        status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true },
        reason: { type: String, required: true, trim: true, maxlength: 240 },
        message: { type: String, trim: true, maxlength: 600, default: '' },
        requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        requestedAt: { type: Date, default: Date.now },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedByName: { type: String, trim: true, maxlength: 100 },
        reviewedAt: { type: Date, default: null },
        adminNotes: { type: String, trim: true, maxlength: 500, default: '' },
      },
      default: null,
    },
    cancellationHistory: {
      type: [
        {
          action: { type: String, enum: ['direct_cancel', 'requested', 'approved', 'rejected'], required: true },
          actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          actorName: { type: String, required: true },
          reason: { type: String, trim: true, maxlength: 240 },
          message: { type: String, trim: true, maxlength: 600 },
          adminNotes: { type: String, trim: true, maxlength: 500 },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

OrderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export interface IPaymentRefundEntry {
  refundId: string;
  gatewayRefundId?: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  requestedBy?: mongoose.Types.ObjectId | null;
  requestedByName?: string;
  gatewayResponse?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface IPaymentWebhookEvent {
  eventId: string;
  source: string;
  status: string;
  receivedAt: Date;
  verified: boolean;
  error?: string;
}

export interface IPaymentTransaction extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  userId?: mongoose.Types.ObjectId | null;
  customerName?: string;
  customerEmail?: string;
  provider: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  idempotencyKey?: string;
  gatewayPaymentId?: string;
  gatewayTransactionId?: string;
  gatewayValidationId?: string;
  bankTransactionId?: string;
  gatewaySessionKey?: string;
  gatewayUrl?: string;
  amount: number;
  requestedAmount: number;
  verifiedAmount?: number | null;
  currency: string;
  status: PaymentTransactionStatus;
  failureReason?: string;
  refundedAmount: number;
  refunds: IPaymentRefundEntry[];
  webhookEvents: IPaymentWebhookEvent[];
  reconciledAt?: Date | null;
  reconciliationAttempts: number;
  verifiedAt?: Date | null;
  initiatedAt?: Date;
  authorizedAt?: Date | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  expiresAt?: Date | null;
  processingLockAt?: Date | null;
  rawPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerName: { type: String },
    customerEmail: { type: String, lowercase: true, trim: true },
    provider: { type: String, required: true, index: true },
    paymentMethod: {
      type: String,
      enum: ['cod', 'sslcommerz', 'bkash', 'nagad', 'card'],
      default: 'sslcommerz',
      index: true,
    },
    transactionId: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, sparse: true, index: true },
    gatewayPaymentId: { type: String, sparse: true, index: true },
    gatewayTransactionId: { type: String, unique: true, sparse: true, index: true },
    gatewayValidationId: { type: String, unique: true, sparse: true, index: true },
    bankTransactionId: { type: String },
    gatewaySessionKey: { type: String },
    gatewayUrl: { type: String },
    amount: { type: Number, required: true },
    requestedAmount: { type: Number, default: 0 },
    verifiedAmount: { type: Number, default: null },
    currency: { type: String, default: 'BDT' },
    status: {
      type: String,
      enum: [
        'initiated',
        'pending',
        'authorized',
        'paid',
        'failed',
        'cancelled',
        'expired',
        'refund_pending',
        'partially_refunded',
        'refunded',
      ],
      default: 'initiated',
      index: true,
    },
    failureReason: { type: String },
    refundedAmount: { type: Number, default: 0 },
    refunds: {
      type: [
        {
          refundId: { type: String, required: true },
          gatewayRefundId: { type: String },
          amount: { type: Number, required: true, min: 0 },
          reason: { type: String, required: true },
          status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
          requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          requestedByName: { type: String },
          gatewayResponse: { type: Schema.Types.Mixed },
          createdAt: { type: Date, default: Date.now },
          completedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    webhookEvents: {
      type: [
        {
          eventId: { type: String, required: true },
          source: { type: String, required: true },
          status: { type: String, required: true },
          receivedAt: { type: Date, default: Date.now },
          verified: { type: Boolean, default: false },
          error: { type: String },
        },
      ],
      default: [],
    },
    reconciledAt: { type: Date, default: null },
    reconciliationAttempts: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
    initiatedAt: { type: Date, default: Date.now },
    authorizedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    processingLockAt: { type: Date, default: null },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ provider: 1, status: 1, createdAt: -1 });

export function serializePaymentTransaction(t: Record<string, unknown>) {
  const provider = String(t.provider || t.gateway || 'unknown');
  return {
    ...t,
    id: String(t._id || t.id || ''),
    provider,
    gateway: provider,
    requestedAmount: Number(t.requestedAmount ?? t.amount ?? 0),
  };
}

export const PaymentTransactionModel =
  mongoose.models.PaymentTransaction || mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);
