import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createBlogController,
  createCmsPageController,
  createFaqController,
  deleteBlogController,
  deleteCmsPageController,
  deleteFaqController,
  getHomepageConfigController,
  getSettingsController,
  listBlogsController,
  listCmsPagesController,
  listFaqsController,
  listSupportController,
  updateBlogController,
  updateCmsPageController,
  updateFaqController,
  updateHomepageConfigController,
  updateSettingsController,
  updateSupportController,
} from './cmsSettings.controller';
import {
  addHomepageLayoutSectionController,
  deleteHomepageLayoutSectionController,
  getHomepageLayoutController,
  publishHomepageLayoutController,
  reorderHomepageLayoutSectionsController,
  updateHomepageLayoutController,
} from './homepageLayout.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/homepage-layout', requirePermission('cms.manage'), getHomepageLayoutController);
router.put('/homepage-layout', requirePermission('cms.manage'), updateHomepageLayoutController);
router.post('/homepage-layout/sections', requirePermission('cms.manage'), addHomepageLayoutSectionController);
router.put('/homepage-layout/sections/reorder', requirePermission('cms.manage'), reorderHomepageLayoutSectionsController);
router.delete('/homepage-layout/sections/:sectionId', requirePermission('cms.manage'), deleteHomepageLayoutSectionController);
router.post('/homepage-layout/publish', requirePermission('cms.manage'), publishHomepageLayoutController);

router.get('/cms/homepage', requirePermission('cms.manage'), getHomepageConfigController);
router.put('/cms/homepage', requirePermission('cms.manage'), updateHomepageConfigController);

router.get('/cms/pages', requirePermission('cms.manage'), listCmsPagesController);
router.post('/cms/pages', requirePermission('cms.manage'), createCmsPageController);
router.put('/cms/pages/:id', requirePermission('cms.manage'), updateCmsPageController);
router.delete('/cms/pages/:id', requirePermission('cms.manage'), deleteCmsPageController);

router.get('/cms/faqs', requirePermission('cms.manage'), listFaqsController);
router.post('/cms/faqs', requirePermission('cms.manage'), createFaqController);
router.put('/cms/faqs/:id', requirePermission('cms.manage'), updateFaqController);
router.delete('/cms/faqs/:id', requirePermission('cms.manage'), deleteFaqController);

router.get('/cms/blogs', requirePermission('cms.manage'), listBlogsController);
router.post('/cms/blogs', requirePermission('cms.manage'), createBlogController);
router.put('/cms/blogs/:id', requirePermission('cms.manage'), updateBlogController);
router.delete('/cms/blogs/:id', requirePermission('cms.manage'), deleteBlogController);

router.get('/support', requirePermission('support.manage'), listSupportController);
router.patch('/support/:id', requirePermission('support.manage'), updateSupportController);

router.get('/settings', requirePermission('settings.manage'), getSettingsController);
router.put('/settings', requirePermission('settings.manage'), updateSettingsController);

export default router;
