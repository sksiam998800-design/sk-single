import type { z } from 'zod';
import { CouponModel, DiscountRuleModel, PromotionalCampaignModel } from './coupon.model';
import { AppError } from '../../middleware/error.middleware';
import type { campaignSchema, couponSchema, discountRuleSchema } from './coupon.validation';

export async function listCouponsAdmin(params: { q?: string; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.status === 'active') filter.isActive = true;
  if (params.status === 'inactive') filter.isActive = false;
  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: regex }, { description: regex }];
  }
  const coupons = await CouponModel.find(filter).sort({ createdAt: -1 }).lean();
  return coupons.map((c) => ({ ...c, id: String(c._id) }));
}

export async function getCouponByIdAdmin(id: string) {
  const coupon = await CouponModel.findById(id).lean();
  if (!coupon) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  return { ...coupon, id: String(coupon._id) };
}

export async function createCouponAdmin(input: z.infer<typeof couponSchema>) {
  const coupon = await CouponModel.create(input);
  return { ...coupon.toObject(), id: String(coupon._id) };
}

export async function updateCouponAdmin(id: string, input: z.infer<typeof couponSchema>) {
  const updated = await CouponModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteCouponAdmin(id: string) {
  const deleted = await CouponModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  return { deleted: true };
}

export async function listDiscountRulesAdmin() {
  const rules = await DiscountRuleModel.find().sort({ createdAt: -1 }).lean();
  return rules.map((r) => ({ ...r, id: String(r._id) }));
}

export async function createDiscountRuleAdmin(input: z.infer<typeof discountRuleSchema>) {
  const rule = await DiscountRuleModel.create(input);
  return { ...rule.toObject(), id: String(rule._id) };
}

export async function updateDiscountRuleAdmin(id: string, input: z.infer<typeof discountRuleSchema>) {
  const updated = await DiscountRuleModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'RULE_NOT_FOUND', 'Discount rule not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteDiscountRuleAdmin(id: string) {
  const deleted = await DiscountRuleModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'RULE_NOT_FOUND', 'Discount rule not found.');
  return { deleted: true };
}

export async function listCampaignsAdmin(campaignType?: string) {
  const filter: Record<string, unknown> = {};
  if (campaignType) filter.campaignType = campaignType;
  const campaigns = await PromotionalCampaignModel.find(filter).sort({ createdAt: -1 }).lean();
  return campaigns.map((c) => ({ ...c, id: String(c._id) }));
}

export async function createCampaignAdmin(input: z.infer<typeof campaignSchema>) {
  const campaign = await PromotionalCampaignModel.create(input);
  return { ...campaign.toObject(), id: String(campaign._id) };
}

export async function updateCampaignAdmin(id: string, input: z.infer<typeof campaignSchema>) {
  const updated = await PromotionalCampaignModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteCampaignAdmin(id: string) {
  const deleted = await PromotionalCampaignModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.');
  return { deleted: true };
}
