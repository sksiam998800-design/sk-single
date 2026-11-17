import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { brandSchema } from './brand.validation';
import {
  createBrand,
  deleteBrand,
  getBrandById,
  listBrandsAdmin,
  updateBrand,
} from './brand.service';

export async function listBrandsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const brands = await listBrandsAdmin();
    sendSuccess(res, { brands });
  } catch (err) {
    next(err);
  }
}

export async function getBrandController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getBrandById(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createBrandController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = brandSchema.parse(req.body);
    const brand = await createBrand(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'brand.create',
      resourceType: 'Brand',
      resourceId: brand.id,
      summary: `Created brand ${brand.name}`,
    });
    sendCreated(res, { brand });
  } catch (err) {
    next(err);
  }
}

export async function updateBrandController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = brandSchema.parse(req.body);
    const brand = await updateBrand(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'brand.update',
      resourceType: 'Brand',
      resourceId: brand.id,
      summary: `Updated brand ${brand.name}`,
    });
    sendSuccess(res, { brand });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrandController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id, name } = await deleteBrand(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'brand.delete',
      resourceType: 'Brand',
      resourceId: id,
      summary: `Deleted brand ${name}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
