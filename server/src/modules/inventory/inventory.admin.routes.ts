import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  adjustInventoryController,
  listInventoryMovementsController,
  listStockLevelsController,
} from './inventory.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/inventory/stock', requirePermission('inventory.view'), listStockLevelsController);
router.get('/inventory/movements', requirePermission('inventory.view'), listInventoryMovementsController);
router.post('/inventory/adjust', requirePermission('inventory.adjust'), adjustInventoryController);

export default router;
