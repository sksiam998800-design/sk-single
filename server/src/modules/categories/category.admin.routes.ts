import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  listCategoriesController,
  updateCategoryController,
} from './category.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/categories', requirePermission('catalog.view'), listCategoriesController);
router.get('/categories/:id', requirePermission('catalog.view'), getCategoryController);
router.post('/categories', requirePermission('catalog.manage'), createCategoryController);
router.put('/categories/:id', requirePermission('catalog.manage'), updateCategoryController);
router.delete('/categories/:id', requirePermission('catalog.manage'), deleteCategoryController);

export default router;
