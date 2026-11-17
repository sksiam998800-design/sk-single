import { z } from 'zod';

export const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(40).toUpperCase(),
    description: z.string().max(240).optional(),
    discountType: z.enum(['fixed', 'percentage']),
    discountValue: z.number().min(1),
    maxDiscountAmount: z.number().min(0).nullable().optional(),
    minOrderAmount: z.number().min(0).default(0),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
    usageLimit: z.number().int().min(1).nullable().optional(),
    perCustomerLimit: z.number().int().min(1).nullable().optional(),
    eligibleCategoryIds: z.array(z.string()).default([]),
    eligibleProductIds: z.array(z.string()).default([]),
  })
  .refine((data) => data.discountType !== 'percentage' || data.discountValue <= 100, {
    message: 'Percentage discount cannot exceed 100%.',
    path: ['discountValue'],
  });

export const discountRuleSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().max(260).optional(),
    ruleType: z.enum(['percentage', 'fixed', 'bulk']).default('percentage'),
    value: z.number().min(1),
    minQty: z.number().int().min(1).default(1),
    minSpend: z.number().min(0).default(0),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.ruleType === 'fixed' || data.value <= 100, {
    message: 'Percentage discount rule cannot exceed 100%.',
    path: ['value'],
  });

export const campaignSchema = z.object({
  title: z.string().trim().min(2).max(140),
  subtitle: z.string().max(260).optional(),
  campaignType: z.enum(['flash_sale', 'special_offer', 'seasonal']).default('special_offer'),
  discountLabel: z.string().trim().min(1).max(60),
  badgeText: z.string().max(60).optional(),
  bannerImageUrl: z.string().optional(),
  ctaUrl: z.string().default('/shop'),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
