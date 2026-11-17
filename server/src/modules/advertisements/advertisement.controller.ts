import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { promoAdSchema } from './advertisement.validation';
import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisementById,
  listAdvertisements,
  updateAdvertisement,
} from './advertisement.service';

export async function listAdsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const ads = await listAdvertisements({
      q: String(req.query.q || '').trim(),
      placement: String(req.query.placement || '').trim(),
      status: String(req.query.status || '').trim(),
    });
    sendSuccess(res, { ads });
  } catch (err) {
    next(err);
  }
}

export async function getAdController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const ad = await getAdvertisementById(req.params.id);
    sendSuccess(res, { ad });
  } catch (err) {
    next(err);
  }
}

export async function createAdController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = promoAdSchema.parse(req.body);
    const ad = await createAdvertisement(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'ad.create',
      resourceType: 'PromotionalAd',
      resourceId: ad.id,
      summary: `Created promotional placement: ${ad.title}`,
    });
    sendCreated(res, { ad });
  } catch (err) {
    next(err);
  }
}

export async function updateAdController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = promoAdSchema.parse(req.body);
    const ad = await updateAdvertisement(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'ad.update',
      resourceType: 'PromotionalAd',
      resourceId: ad.id,
      summary: `Updated promotional placement: ${ad.title}`,
    });
    sendSuccess(res, { ad });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = await deleteAdvertisement(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'ad.delete',
      resourceType: 'PromotionalAd',
      resourceId: id,
      summary: `Deleted promotional placement ${id}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
