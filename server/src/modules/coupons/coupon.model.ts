import mongoose, { Schema, type Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  usageLimit?: number | null;
  usedCount: number;
  perCustomerLimit?: number | null;
  eligibleCategoryIds: mongoose.Types.ObjectId[];
  eligibleProductIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, maxlength: 240 },
    discountType: { type: String, enum: ['fixed', 'percentage'], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    maxDiscountAmount: { type: Number, min: 0, default: null },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, min: 1, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, min: 1, default: 1 },
    eligibleCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    eligibleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true },
);

export const CouponModel = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);

export interface ICouponRedemption extends Document {
  couponId: mongoose.Types.ObjectId;
  code: string;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  discountAmount: number;
  createdAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    code: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    discountAmount: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CouponRedemptionModel =
  mongoose.models.CouponRedemption || mongoose.model<ICouponRedemption>('CouponRedemption', CouponRedemptionSchema);

export interface IDiscountRule extends Document {
  name: string;
  description?: string;
  ruleType: 'percentage' | 'fixed' | 'bulk';
  value: number;
  minQty: number;
  minSpend: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountRuleSchema = new Schema<IDiscountRule>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 260 },
    ruleType: { type: String, enum: ['percentage', 'fixed', 'bulk'], default: 'percentage' },
    value: { type: Number, required: true, min: 1 },
    minQty: { type: Number, default: 1, min: 1 },
    minSpend: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const DiscountRuleModel =
  mongoose.models.DiscountRule || mongoose.model<IDiscountRule>('DiscountRule', DiscountRuleSchema);

export interface IPromotionalCampaign extends Document {
  title: string;
  subtitle?: string;
  campaignType: 'flash_sale' | 'special_offer' | 'seasonal';
  discountLabel: string;
  badgeText?: string;
  bannerImageUrl?: string;
  ctaUrl: string;
  productIds: mongoose.Types.ObjectId[];
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionalCampaignSchema = new Schema<IPromotionalCampaign>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    subtitle: { type: String, maxlength: 260 },
    campaignType: {
      type: String,
      enum: ['flash_sale', 'special_offer', 'seasonal'],
      default: 'special_offer',
      index: true,
    },
    discountLabel: { type: String, required: true, maxlength: 60 },
    badgeText: { type: String, maxlength: 60 },
    bannerImageUrl: { type: String },
    ctaUrl: { type: String, default: '/shop' },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const PromotionalCampaignModel =
  mongoose.models.PromotionalCampaign ||
  mongoose.model<IPromotionalCampaign>('PromotionalCampaign', PromotionalCampaignSchema);

