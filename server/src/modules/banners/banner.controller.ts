import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { uploadImageToCloudinary } from '../../services/cloudinary.service';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { bannerReorderSchema, bannerSchema, bannerStatusSchema } from './banner.validation';
import {
  createBanner,
  deleteBanner,
  duplicateBanner,
  getBannerById,
  listBanners,
  reorderBanners,
  updateBanner,
  updateBannerStatus,
} from './banner.service';

function isValidImageSignature(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < 12) return false;
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export async function bannerMediaUploadController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Please attach a JPG, PNG, or WebP banner image.');
    }
    const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedMimes.has(req.file.mimetype)) {
      throw new AppError(400, 'INVALID_IMAGE_TYPE', 'Only JPG, PNG, and WebP images are supported for banners.');
    }
    if (!isValidImageSignature(req.file.buffer, req.file.mimetype)) {
      throw new AppError(400, 'INVALID_IMAGE_DATA', 'Uploaded file content does not match a valid JPG, PNG, or WebP image.');
    }

    const result = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      folder: 'banners',
    });

    await recordAuditLog({
      actor: req.user,
      action: 'banner.media_upload',
      resourceType: 'CloudinaryAsset',
      resourceId: result.publicId,
      summary: 'Uploaded banner media image',
    });

    sendCreated(res, { asset: result });
  } catch (err) {
    next(err);
  }
}

export async function listBannersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await listBanners({
      q: String(req.query.q || '').trim(),
      placement: String(req.query.placement || '').trim(),
      status: String(req.query.status || '').trim(),
      sort: String(req.query.sort || '').trim(),
    });
    sendSuccess(res, { banners });
  } catch (err) {
    next(err);
  }
}

export async function getBannerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await getBannerById(req.params.id);
    sendSuccess(res, { banner });
  } catch (err) {
    next(err);
  }
}

export async function createBannerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = bannerSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const banner = await createBanner(parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.create',
      resourceType: 'Banner',
      resourceId: banner.id,
      summary: `Created dynamic banner "${String((banner as { title?: unknown }).title || '')}" (${String((banner as { placement?: unknown }).placement || '')})`,
    });
    sendCreated(res, { banner });
  } catch (err) {
    next(err);
  }
}

export async function updateBannerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = bannerSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const banner = await updateBanner(req.params.id, parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.update',
      resourceType: 'Banner',
      resourceId: banner.id,
      summary: `Updated dynamic banner "${String((banner as { title?: unknown }).title || '')}"`,
    });
    sendSuccess(res, { banner });
  } catch (err) {
    next(err);
  }
}

export async function duplicateBannerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const actorId = req.user?._id ? String(req.user._id) : null;
    const banner = await duplicateBanner(req.params.id, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.duplicate',
      resourceType: 'Banner',
      resourceId: banner.id,
      summary: `Duplicated banner into "${String((banner as { name?: unknown }).name || '')}"`,
    });
    sendCreated(res, { banner });
  } catch (err) {
    next(err);
  }
}

export async function updateBannerStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = bannerStatusSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const banner = await updateBannerStatus(req.params.id, status, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.status_change',
      resourceType: 'Banner',
      resourceId: banner.id,
      summary: `Changed banner ${banner.id} status to ${status}`,
    });
    sendSuccess(res, { banner });
  } catch (err) {
    next(err);
  }
}

export async function reorderBannersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = bannerReorderSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const banners = await reorderBanners(parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.reorder',
      resourceType: 'Banner',
      summary: `Reordered ${parsed.items.length} banners`,
    });
    sendSuccess(res, { banners });
  } catch (err) {
    next(err);
  }
}

export async function deleteBannerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = await deleteBanner(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'banner.delete',
      resourceType: 'Banner',
      resourceId: id,
      summary: `Deleted banner ${id}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
