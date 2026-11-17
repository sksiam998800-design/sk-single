import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createAdController,
  deleteAdController,
  getAdController,
  listAdsController,
  updateAdController,
} from './advertisement.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/ads', requirePermission('ads.manage'), listAdsController);
router.get('/ads/:id', requirePermission('ads.manage'), getAdController);
router.post('/ads', requirePermission('ads.manage'), createAdController);
router.put('/ads/:id', requirePermission('ads.manage'), updateAdController);
router.delete('/ads/:id', requirePermission('ads.manage'), deleteAdController);

export default router;
