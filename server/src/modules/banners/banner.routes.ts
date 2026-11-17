import { Router } from 'express';
import multer from 'multer';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  bannerMediaUploadController,
  createBannerController,
  deleteBannerController,
  duplicateBannerController,
  getBannerController,
  listBannersController,
  reorderBannersController,
  updateBannerController,
  updateBannerStatusController,
} from './banner.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireDatabase, authenticateRequired);

// Register static sub-paths BEFORE :id routes
router.post('/banners/media/upload', requirePermission('cms.manage'), upload.single('file'), bannerMediaUploadController);
router.patch('/banners/reorder', requirePermission('cms.manage'), reorderBannersController);

router.get('/banners', requirePermission('cms.manage'), listBannersController);
router.get('/banners/:id', requirePermission('cms.manage'), getBannerController);
router.post('/banners', requirePermission('cms.manage'), createBannerController);
router.post('/banners/:id/duplicate', requirePermission('cms.manage'), duplicateBannerController);
router.put('/banners/:id', requirePermission('cms.manage'), updateBannerController);
router.patch('/banners/:id/status', requirePermission('cms.manage'), updateBannerStatusController);
router.delete('/banners/:id', requirePermission('cms.manage'), deleteBannerController);

export default router;
