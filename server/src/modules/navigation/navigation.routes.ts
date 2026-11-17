import { Router } from 'express';
import multer from 'multer';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  addNavigationDropdownItemController,
  addNavigationGroupController,
  addNavigationSlideController,
  createNavigationMenuController,
  deleteNavigationDropdownItemController,
  deleteNavigationMenuController,
  deleteNavigationSlideController,
  duplicateNavigationMenuController,
  getNavigationMenuController,
  listNavigationMenusController,
  navigationMediaUploadController,
  reorderNavigationMenusController,
  updateNavigationMenuController,
  updateNavigationMenuStatusController,
  updateNavigationSlideController,
  updateNavigationSliderSettingsController,
} from './navigation.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireDatabase, authenticateRequired);

// Static sub-paths registered BEFORE :id routes
router.post(
  '/navigation/media/upload',
  requirePermission('cms.manage'),
  upload.single('file'),
  navigationMediaUploadController,
);
router.patch('/navigation/reorder', requirePermission('cms.manage'), reorderNavigationMenusController);

// Level 1 Navigation Menu CRUD
router.get('/navigation', requirePermission('cms.manage'), listNavigationMenusController);
router.get('/navigation/:id', requirePermission('cms.manage'), getNavigationMenuController);
router.post('/navigation', requirePermission('cms.manage'), createNavigationMenuController);
router.put('/navigation/:id', requirePermission('cms.manage'), updateNavigationMenuController);
router.patch('/navigation/:id/status', requirePermission('cms.manage'), updateNavigationMenuStatusController);
router.post('/navigation/:id/duplicate', requirePermission('cms.manage'), duplicateNavigationMenuController);
router.delete('/navigation/:id', requirePermission('cms.manage'), deleteNavigationMenuController);

// Level 2 Groups & Dropdown Items
router.post('/navigation/:id/groups', requirePermission('cms.manage'), addNavigationGroupController);
router.post('/navigation/:id/groups/:groupId/items', requirePermission('cms.manage'), addNavigationDropdownItemController);
router.delete(
  '/navigation/:id/groups/:groupId/items/:itemId',
  requirePermission('cms.manage'),
  deleteNavigationDropdownItemController,
);

// Mega Menu Promotional Single-Image Slider Management
router.post('/navigation/:id/slides', requirePermission('cms.manage'), addNavigationSlideController);
router.put('/navigation/:id/slides/:slideId', requirePermission('cms.manage'), updateNavigationSlideController);
router.delete('/navigation/:id/slides/:slideId', requirePermission('cms.manage'), deleteNavigationSlideController);
router.patch('/navigation/:id/slider-settings', requirePermission('cms.manage'), updateNavigationSliderSettingsController);

export default router;
