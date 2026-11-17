import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  createStaffController,
  deleteStaffController,
  getRolesController,
  listAuditLogsController,
  listStaffController,
  listSystemLogsController,
  systemHealthController,
  updateStaffController,
} from './system.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/roles', requirePermission('staff.manage'), getRolesController);
router.get('/staff', requirePermission('staff.manage'), listStaffController);
router.post('/staff', requirePermission('staff.manage'), createStaffController);
router.patch('/staff/:id', requirePermission('staff.manage'), updateStaffController);
router.delete('/staff/:id', requirePermission('staff.manage'), deleteStaffController);

router.get('/audit-logs', requirePermission('audit.view'), listAuditLogsController);
router.get('/logs', requirePermission('logs.view'), listSystemLogsController);
router.get('/system-health', requirePermission('system.view'), systemHealthController);

export default router;
