import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createHeroSlideController,
  deleteHeroSlideController,
  getHeroSlideController,
  listHeroSlidesController,
  reorderHeroSlidesController,
  updateHeroSlideController,
  updateHeroSlideStatusController,
} from './heroSlide.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.patch('/hero-slides/reorder', requirePermission('cms.manage'), reorderHeroSlidesController);
router.get('/hero-slides', requirePermission('cms.manage'), listHeroSlidesController);
router.get('/hero-slides/:id', requirePermission('cms.manage'), getHeroSlideController);
router.post('/hero-slides', requirePermission('cms.manage'), createHeroSlideController);
router.put('/hero-slides/:id', requirePermission('cms.manage'), updateHeroSlideController);
router.patch('/hero-slides/:id/status', requirePermission('cms.manage'), updateHeroSlideStatusController);
router.delete('/hero-slides/:id', requirePermission('cms.manage'), deleteHeroSlideController);

export default router;

