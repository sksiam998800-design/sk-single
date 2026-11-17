import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';
import {
  exportSalesCsv,
  getAdminNotificationsFeed,
  getAdminOverviewData,
  getAnalyticsReport,
  getWishlistAnalyticsAdmin,
  searchAdminEntities,
} from './analytics.service';

export async function getOverviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days || 30)));
    const revRange = String(req.query.revRange || 'month');
    const data = await getAdminOverviewData(days, revRange);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function adminSearchController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '').trim();
    const results = await searchAdminEntities(q);
    sendSuccess(res, { results });
  } catch (err) {
    next(err);
  }
}

export async function notificationsFeedController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getAdminNotificationsFeed();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function analyticsReportController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days || 30)));
    const report = await getAnalyticsReport(days);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
}

export async function exportSalesCsvController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const csv = await exportSalesCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="novara-sales-report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function wishlistAnalyticsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getWishlistAnalyticsAdmin();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

