import { Router } from 'express';
import { requireDatabase } from '../../database/connection';
import { authenticateRequired, requirePermission } from '../../middleware/auth.middleware';
import {
  adminSearchController,
  analyticsReportController,
  exportSalesCsvController,
  getOverviewController,
  notificationsFeedController,
  wishlistAnalyticsController,
} from './analytics.controller';

const router = Router();
router.use(requireDatabase, authenticateRequired);

router.get('/overview', requirePermission('dashboard.view'), getOverviewController);
router.get('/search', requirePermission('dashboard.view'), adminSearchController);
router.get('/notifications', requirePermission('dashboard.view'), notificationsFeedController);
router.get('/analytics/wishlist', requirePermission('reports.view'), wishlistAnalyticsController);
router.get('/reports/analytics', requirePermission('reports.view'), analyticsReportController);
router.get('/reports/sales-csv', requirePermission('reports.view'), exportSalesCsvController);

export default router;
