import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createCustomerGroupController,
  deleteCustomerGroupController,
  getCustomerController,
  listCustomerGroupsController,
  listCustomersController,
  updateCustomerGroupController,
  updateCustomerStatusController,
} from './customer.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/customers', requirePermission('customers.view'), listCustomersController);
router.get('/customers/:id', requirePermission('customers.view'), getCustomerController);
router.patch('/customers/:id/status', requirePermission('customers.view'), updateCustomerStatusController);

router.get('/customer-groups', requirePermission('customers.view'), listCustomerGroupsController);
router.post('/customer-groups', requirePermission('settings.manage'), createCustomerGroupController);
router.put('/customer-groups/:id', requirePermission('settings.manage'), updateCustomerGroupController);
router.delete('/customer-groups/:id', requirePermission('settings.manage'), deleteCustomerGroupController);

export default router;
