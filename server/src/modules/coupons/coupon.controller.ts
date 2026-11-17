import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { campaignSchema, couponSchema, discountRuleSchema } from './coupon.validation';
import {
  createCampaignAdmin,
  createCouponAdmin,
  createDiscountRuleAdmin,
  deleteCampaignAdmin,
  deleteCouponAdmin,
  deleteDiscountRuleAdmin,
  getCouponByIdAdmin,
  listCampaignsAdmin,
  listCouponsAdmin,
  listDiscountRulesAdmin,
  updateCampaignAdmin,
  updateCouponAdmin,
  updateDiscountRuleAdmin,
} from './coupon.service';

export async function listCouponsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const coupons = await listCouponsAdmin({
      q: String(req.query.q || '').trim(),
      status: String(req.query.status || '').trim(),
    });
    sendSuccess(res, { coupons });
  } catch (err) {
    next(err);
  }
}

export async function getCouponController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const coupon = await getCouponByIdAdmin(req.params.id);
    sendSuccess(res, { coupon });
  } catch (err) {
    next(err);
  }
}

export async function createCouponController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = couponSchema.parse(req.body);
    const coupon = await createCouponAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'coupon.create',
      resourceType: 'Coupon',
      resourceId: coupon.code,
      summary: `Created coupon ${coupon.code}`,
    });
    sendCreated(res, { coupon });
  } catch (err) {
    next(err);
  }
}

export async function updateCouponController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = couponSchema.parse(req.body);
    const coupon = await updateCouponAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'coupon.update',
      resourceType: 'Coupon',
      resourceId: coupon.code,
      summary: `Updated coupon ${coupon.code}`,
    });
    sendSuccess(res, { coupon });
  } catch (err) {
    next(err);
  }
}

export async function deleteCouponController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteCouponAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listDiscountRulesController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rules = await listDiscountRulesAdmin();
    sendSuccess(res, { rules });
  } catch (err) {
    next(err);
  }
}

export async function createDiscountRuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = discountRuleSchema.parse(req.body);
    const rule = await createDiscountRuleAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'discount_rule.create',
      resourceType: 'DiscountRule',
      resourceId: rule.id,
      summary: `Created discount rule ${rule.name}`,
    });
    sendCreated(res, { rule });
  } catch (err) {
    next(err);
  }
}

export async function updateDiscountRuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = discountRuleSchema.parse(req.body);
    const rule = await updateDiscountRuleAdmin(req.params.id, parsed);
    sendSuccess(res, { rule });
  } catch (err) {
    next(err);
  }
}

export async function deleteDiscountRuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteDiscountRuleAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listCampaignsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const campaignType = String(req.query.type || '').trim() || undefined;
    const campaigns = await listCampaignsAdmin(campaignType);
    sendSuccess(res, { campaigns });
  } catch (err) {
    next(err);
  }
}

export async function createCampaignController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = campaignSchema.parse(req.body);
    const campaign = await createCampaignAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'campaign.create',
      resourceType: 'PromotionalCampaign',
      resourceId: campaign.id,
      summary: `Created campaign ${campaign.title} (${campaign.campaignType})`,
    });
    sendCreated(res, { campaign });
  } catch (err) {
    next(err);
  }
}

export async function updateCampaignController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = campaignSchema.parse(req.body);
    const campaign = await updateCampaignAdmin(req.params.id, parsed);
    sendSuccess(res, { campaign });
  } catch (err) {
    next(err);
  }
}

export async function deleteCampaignController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteCampaignAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
