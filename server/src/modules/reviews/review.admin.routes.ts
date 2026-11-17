import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  deleteReviewController,
  featureReviewController,
  getReviewController,
  listReviewsController,
  moderateReviewController,
} from './review.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/reviews', requirePermission('reviews.moderate'), listReviewsController);
router.get('/reviews/:id', requirePermission('reviews.moderate'), getReviewController);
router.patch('/reviews/:id/moderate', requirePermission('reviews.moderate'), moderateReviewController);
router.patch('/reviews/:id/featured', requirePermission('reviews.moderate'), featureReviewController);
router.delete('/reviews/:id', requirePermission('reviews.moderate'), deleteReviewController);

export default router;
