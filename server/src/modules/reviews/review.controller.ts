import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';
import {
  deleteReviewAdmin,
  getReviewByIdAdmin,
  listReviewsAdmin,
  moderateReviewAdmin,
  setReviewFeaturedAdmin,
} from './review.service';

export async function listReviewsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = String(req.query.status || '').trim() || undefined;
    const ratingNum = Number(req.query.rating || 0);
    const rating = ratingNum >= 1 && ratingNum <= 5 ? ratingNum : undefined;
    const q = String(req.query.q || '').trim() || undefined;
    const reviews = await listReviewsAdmin({ status, rating, q });
    sendSuccess(res, { reviews });
  } catch (err) {
    next(err);
  }
}

export async function getReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const review = await getReviewByIdAdmin(req.params.id);
    sendSuccess(res, { review });
  } catch (err) {
    next(err);
  }
}

export async function moderateReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = z
      .object({
        status: z.enum(['approved', 'rejected']),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(req.body);
    const review = await moderateReviewAdmin({
      id: req.params.id,
      status: parsed.status,
      reason: parsed.reason,
      actorId: req.user!._id,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'review.moderate',
      resourceType: 'Review',
      resourceId: review.id,
      summary: `Moderated review ${review.id} -> ${parsed.status}`,
    });
    sendSuccess(res, { review });
  } catch (err) {
    next(err);
  }
}

export async function featureReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { isFeatured } = z.object({ isFeatured: z.boolean() }).parse(req.body);
    const review = await setReviewFeaturedAdmin(req.params.id, isFeatured);
    await recordAuditLog({
      actor: req.user,
      action: 'review.feature',
      resourceType: 'Review',
      resourceId: review.id,
      summary: `${isFeatured ? 'Featured' : 'Unfeatured'} review ${review.id}`,
    });
    sendSuccess(res, { review });
  } catch (err) {
    next(err);
  }
}

export async function deleteReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = await deleteReviewAdmin(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'review.delete',
      resourceType: 'Review',
      resourceId: id,
      summary: `Deleted review ${id}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
