import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createCampaignController,
  createCouponController,
  createDiscountRuleController,
  deleteCampaignController,
  deleteCouponController,
  deleteDiscountRuleController,
  getCouponController,
  listCampaignsController,
  listCouponsController,
  listDiscountRulesController,
  updateCampaignController,
  updateCouponController,
  updateDiscountRuleController,
} from './coupon.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/coupons', requirePermission('marketing.manage'), listCouponsController);
router.get('/coupons/:id', requirePermission('marketing.manage'), getCouponController);
router.post('/coupons', requirePermission('marketing.manage'), createCouponController);
router.put('/coupons/:id', requirePermission('marketing.manage'), updateCouponController);
router.delete('/coupons/:id', requirePermission('marketing.manage'), deleteCouponController);

router.get('/promotions/rules', requirePermission('marketing.manage'), listDiscountRulesController);
router.post('/promotions/rules', requirePermission('marketing.manage'), createDiscountRuleController);
router.put('/promotions/rules/:id', requirePermission('marketing.manage'), updateDiscountRuleController);
router.delete('/promotions/rules/:id', requirePermission('marketing.manage'), deleteDiscountRuleController);

router.get('/promotions/campaigns', requirePermission('marketing.manage'), listCampaignsController);
router.post('/promotions/campaigns', requirePermission('marketing.manage'), createCampaignController);
router.put('/promotions/campaigns/:id', requirePermission('marketing.manage'), updateCampaignController);
router.delete('/promotions/campaigns/:id', requirePermission('marketing.manage'), deleteCampaignController);

export default router;
