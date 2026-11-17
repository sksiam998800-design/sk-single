import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { uploadImageToCloudinary } from '../../services/cloudinary.service';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import {
  answerQuestionSchema,
  attributeGroupSchema,
  attributePresetSchema,
  bulkActionSchema,
  bulkImportSchema,
  productSchema,
  productStatusSchema,
} from './product.validation';
import {
  answerProductQuestionAdmin,
  bulkImportProductsAdmin,
  bulkProductActionAdmin,
  createAttributeAdmin,
  createAttributeGroupAdmin,
  createProductAdmin,
  deleteAttributeAdmin,
  deleteAttributeGroupAdmin,
  deleteProductAdmin,
  deleteProductQuestionAdmin,
  duplicateProductAdmin,
  exportProductsCsv,
  getAttributesByCategoryAdmin,
  getProductByIdAdmin,
  listAttributeGroupsAdmin,
  listAttributesAdmin,
  listProductsAdmin,
  updateAttributeAdmin,
  updateAttributeGroupAdmin,
  updateProductAdmin,
  updateProductStatusAdmin,
} from './product.service';

export async function mediaUploadController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Please attach an image file to upload.');
    }
    const folder = String(req.body.folder || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    const result = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      folder,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'media.upload',
      resourceType: 'CloudinaryAsset',
      resourceId: result.publicId,
      summary: `Uploaded image asset to ${folder}`,
    });
    sendCreated(res, { asset: result });
  } catch (err) {
    next(err);
  }
}

export async function listProductsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim();
    const categoryId = String(req.query.categoryId || '').trim();
    const data = await listProductsAdmin({ page, limit, q, status, categoryId });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getProductController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getProductByIdAdmin(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createProductController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = productSchema.parse(req.body);
    const product = await createProductAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'product.create',
      resourceType: 'Product',
      resourceId: String(product.id || ''),
      summary: `Created product ${parsed.name} (${parsed.sku}) [${parsed.status}]`,
    });
    sendCreated(res, { product });
  } catch (err) {
    next(err);
  }
}

export async function updateProductController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = productSchema.parse(req.body);
    const result = await updateProductAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: result.priceChanged ? 'product.price_change' : 'product.update',
      resourceType: 'Product',
      resourceId: result.id,
      summary: `Updated product ${result.name} (${result.sku})${result.priceChanged ? ' [Price Updated]' : ''}`,
    });
    sendSuccess(res, { product: result.product });
  } catch (err) {
    next(err);
  }
}

export async function updateProductStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = productStatusSchema.parse(req.body);
    const result = await updateProductStatusAdmin(req.params.id, status);
    await recordAuditLog({
      actor: req.user,
      action: 'product.status_change',
      resourceType: 'Product',
      resourceId: result.id,
      summary: `Changed product ${result.name} (${result.sku}) status from ${result.prevStatus} to ${status}`,
    });
    sendSuccess(res, { product: result.product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const permanent = req.query.permanent === 'true';
    const result = await deleteProductAdmin(req.params.id, permanent);
    await recordAuditLog({
      actor: req.user,
      action: permanent ? 'product.delete_permanent' : 'product.archive',
      resourceType: 'Product',
      resourceId: result.id,
      summary: `${permanent ? 'Permanently deleted' : 'Archived'} product ${result.name} (${result.sku})`,
    });
    sendSuccess(res, { deleted: result.deleted, archived: result.archived });
  } catch (err) {
    next(err);
  }
}

export async function duplicateProductController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await duplicateProductAdmin(req.params.id);
    await recordAuditLog({
      actor: req.user,
      action: 'product.duplicate',
      resourceType: 'Product',
      resourceId: result.id,
      summary: `Duplicated product ${result.sourceName} as ${result.sku}`,
    });
    sendCreated(res, { product: result.product });
  } catch (err) {
    next(err);
  }
}

export async function exportProductsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const csv = await exportProductsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="novara-products-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function bulkImportProductsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = bulkImportSchema.parse(req.body);
    const result = await bulkImportProductsAdmin(parsed);
    if (result.errors.length > 0 && result.importedCount === 0) {
      res.status(400).json({ ok: false, importedCount: 0, errors: result.errors });
      return;
    }
    if (result.importedCount > 0) {
      await recordAuditLog({
        actor: req.user,
        action: 'product.bulk_import',
        resourceType: 'Product',
        summary: `Bulk imported ${result.importedCount} products (${result.errors.length} row errors)`,
      });
    }
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function bulkProductActionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = bulkActionSchema.parse(req.body);
    const result = await bulkProductActionAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: `product.bulk_${parsed.action}`,
      resourceType: 'Product',
      summary: `Applied bulk action "${parsed.action}" to ${parsed.ids.length} products (${result.modifiedCount} updated)`,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listAttributeGroupsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const groups = await listAttributeGroupsAdmin();
    sendSuccess(res, { groups });
  } catch (err) {
    next(err);
  }
}

export async function createAttributeGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = attributeGroupSchema.parse(req.body);
    const group = await createAttributeGroupAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'attribute_group.create',
      resourceType: 'AttributeGroup',
      resourceId: group.id,
      summary: `Created attribute group ${group.name}`,
    });
    sendCreated(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function updateAttributeGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = attributeGroupSchema.parse(req.body);
    const group = await updateAttributeGroupAdmin(req.params.id, parsed);
    sendSuccess(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttributeGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteAttributeGroupAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listAttributesController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const attributes = await listAttributesAdmin();
    sendSuccess(res, { attributes });
  } catch (err) {
    next(err);
  }
}

export async function getAttributesByCategoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const categoryId = String(req.query.categoryId || '').trim();
    const subCategoryId = String(req.query.subCategoryId || '').trim();
    const attributes = await getAttributesByCategoryAdmin(categoryId, subCategoryId || undefined);
    sendSuccess(res, { attributes });
  } catch (err) {
    next(err);
  }
}

export async function createAttributeController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = attributePresetSchema.parse(req.body);
    const attribute = await createAttributeAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'attribute.create',
      resourceType: 'ProductAttributePreset',
      resourceId: attribute.id,
      summary: `Created attribute preset ${attribute.name}`,
    });
    sendCreated(res, { attribute });
  } catch (err) {
    next(err);
  }
}

export async function updateAttributeController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = attributePresetSchema.parse(req.body);
    const attribute = await updateAttributeAdmin(req.params.id, parsed);
    sendSuccess(res, { attribute });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttributeController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteAttributeAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function answerProductQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = answerQuestionSchema.parse(req.body);
    const data = await answerProductQuestionAdmin(
      req.params.id,
      req.params.questionId,
      parsed,
      req.user?.name || 'Store Support',
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteProductQuestionAdmin(req.params.id, req.params.questionId);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
