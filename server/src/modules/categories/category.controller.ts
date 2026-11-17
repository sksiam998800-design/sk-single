import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { categorySchema } from './category.validation';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategoriesAdmin,
  updateCategory,
} from './category.service';

export async function listCategoriesController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const categories = await listCategoriesAdmin();
    sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const category = await getCategoryById(req.params.id);
    sendSuccess(res, { category });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = categorySchema.parse(req.body);
    const category = await createCategory(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'category.create',
      resourceType: 'Category',
      resourceId: category.id,
      summary: `Created category ${category.name}`,
    });
    sendCreated(res, { category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = categorySchema.parse(req.body);
    const category = await updateCategory(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'category.update',
      resourceType: 'Category',
      resourceId: category.id,
      summary: `Updated category ${category.name}`,
    });
    sendSuccess(res, { category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id, name } = await deleteCategory(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'category.delete',
      resourceType: 'Category',
      resourceId: id,
      summary: `Deleted category ${name}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
