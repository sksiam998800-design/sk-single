import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createBrandController,
  deleteBrandController,
  getBrandController,
  listBrandsController,
  updateBrandController,
} from './brand.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/brands', requirePermission('catalog.view'), listBrandsController);
router.get('/brands/:id', requirePermission('catalog.view'), getBrandController);
router.post('/brands', requirePermission('catalog.manage'), createBrandController);
router.put('/brands/:id', requirePermission('catalog.manage'), updateBrandController);
router.delete('/brands/:id', requirePermission('catalog.manage'), deleteBrandController);

export default router;
