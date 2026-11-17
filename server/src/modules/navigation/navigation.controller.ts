import type { NextFunction, Response } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { uploadImageToCloudinary } from '../../services/cloudinary.service';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import {
  navigationGroupSchema,
  navigationItemSchema,
  navigationMenuPublishSchema,
  navigationMenuReorderSchema,
  navigationMenuSchema,
  navigationSlideSchema,
  navigationSliderSettingsSchema,
} from './navigation.validation';
import {
  addDropdownItemAdmin,
  addMenuGroupAdmin,
  addMenuSlideAdmin,
  createNavigationMenuAdmin,
  deleteDropdownItemAdmin,
  deleteMenuSlideAdmin,
  deleteNavigationMenuAdmin,
  duplicateNavigationMenuAdmin,
  getNavigationMenuByIdAdmin,
  listNavigationMenusAdmin,
  reorderNavigationMenusAdmin,
  updateMenuSlideAdmin,
  updateMenuSliderSettingsAdmin,
  updateNavigationMenuAdmin,
  updateNavigationMenuPublishStateAdmin,
} from './navigation.service';

function isValidNavigationImageSignature(buffer: Buffer, mimetype: string): boolean {
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
  if (mimetype === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  return false;
}

export async function navigationMediaUploadController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Please attach a JPG, PNG, WebP, or GIF image file.');
    }
    const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedMimes.has(req.file.mimetype)) {
      throw new AppError(
        400,
        'INVALID_IMAGE_TYPE',
        'Only JPG, PNG, WebP, and GIF images are supported for mega menu media.',
      );
    }
    if (!isValidNavigationImageSignature(req.file.buffer, req.file.mimetype)) {
      throw new AppError(
        400,
        'INVALID_IMAGE_DATA',
        'Uploaded file content does not match a valid image signature.',
      );
    }

    const result = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      folder: 'navigation',
    });

    await recordAuditLog({
      actor: req.user,
      action: 'navigation.media_upload',
      resourceType: 'CloudinaryAsset',
      resourceId: result.publicId,
      summary: 'Uploaded mega menu / slider image asset',
    });

    sendCreated(res, { asset: result });
  } catch (err) {
    next(err);
  }
}

export async function listNavigationMenusController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await listNavigationMenusAdmin();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getNavigationMenuController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const menu = await getNavigationMenuByIdAdmin(req.params.id);
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function createNavigationMenuController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationMenuSchema.parse(req.body);
    const menu = await createNavigationMenuAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.create',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Created navigation menu "${menu.label}" (${menu.type})`,
    });
    sendCreated(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function updateNavigationMenuController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationMenuSchema.parse(req.body);
    const menu = await updateNavigationMenuAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.update',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Updated navigation menu "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function updateNavigationMenuStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationMenuPublishSchema.parse(req.body);
    const menu = await updateNavigationMenuPublishStateAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.status_change',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Updated visibility/publish state for "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function duplicateNavigationMenuController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const menu = await duplicateNavigationMenuAdmin(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.duplicate',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Duplicated navigation menu into "${menu.label}"`,
    });
    sendCreated(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function deleteNavigationMenuController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await deleteNavigationMenuAdmin(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.delete',
      resourceType: 'NavigationMenu',
      resourceId: result.id,
      summary: `Deleted navigation menu ${result.id}`,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function reorderNavigationMenusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationMenuReorderSchema.parse(req.body);
    const data = await reorderNavigationMenusAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.reorder',
      resourceType: 'NavigationMenu',
      summary: `Reordered ${parsed.items.length} navigation menus`,
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function addNavigationGroupController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationGroupSchema.parse(req.body);
    const menu = await addMenuGroupAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.group_add',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Added group "${parsed.title}" to "${menu.label}"`,
    });
    sendCreated(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function addNavigationDropdownItemController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationItemSchema.parse(req.body);
    const menu = await addDropdownItemAdmin(req.params.id, req.params.groupId, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.item_add',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Added dropdown item "${parsed.label}" to "${menu.label}"`,
    });
    sendCreated(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function deleteNavigationDropdownItemController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const menu = await deleteDropdownItemAdmin(req.params.id, req.params.groupId, req.params.itemId);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.item_delete',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Removed dropdown item ${req.params.itemId} from "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function addNavigationSlideController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationSlideSchema.parse(req.body);
    const menu = await addMenuSlideAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.slide_add',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Added promotional slide to "${menu.label}"`,
    });
    sendCreated(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function updateNavigationSlideController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationSlideSchema.parse(req.body);
    const menu = await updateMenuSlideAdmin(req.params.id, req.params.slideId, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.slide_update',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Updated promotional slide ${req.params.slideId} in "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function deleteNavigationSlideController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const menu = await deleteMenuSlideAdmin(req.params.id, req.params.slideId);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.slide_delete',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Deleted promotional slide ${req.params.slideId} from "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}

export async function updateNavigationSliderSettingsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = navigationSliderSettingsSchema.parse(req.body);
    const menu = await updateMenuSliderSettingsAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'navigation.slider_settings_update',
      resourceType: 'NavigationMenu',
      resourceId: menu.id,
      summary: `Updated slider settings for "${menu.label}"`,
    });
    sendSuccess(res, { menu });
  } catch (err) {
    next(err);
  }
}
