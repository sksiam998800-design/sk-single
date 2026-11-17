import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';
import { adjustInventoryStock, listInventoryMovements, listStockLevels } from './inventory.service';

export async function listStockLevelsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const q = String(req.query.q || '').trim();
    const stockFilter = String(req.query.stockFilter || '').trim();
    const data = await listStockLevels({ page, limit, q, stockFilter });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function listInventoryMovementsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(150, Math.max(1, Number(req.query.limit || 50)));
    const productId = String(req.query.productId || '').trim() || undefined;
    const movements = await listInventoryMovements(limit, productId);
    sendSuccess(res, { movements });
  } catch (err) {
    next(err);
  }
}

export async function adjustInventoryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      productId: z.string().min(1),
      variantId: z.string().nullable().optional(),
      delta: z.number().int().refine((n) => n !== 0, 'Adjustment delta cannot be zero'),
      reason: z.string().trim().min(3).max(240),
    });
    const parsed = schema.parse(req.body);
    const product = await adjustInventoryStock({
      productId: parsed.productId,
      variantId: parsed.variantId,
      delta: parsed.delta,
      reason: parsed.reason,
      actorId: req.user!._id,
      actorName: req.user!.name,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'inventory.adjust',
      resourceType: 'Product',
      resourceId: String(product.id),
      summary: `Adjusted stock for ${product.name} by ${parsed.delta > 0 ? `+${parsed.delta}` : parsed.delta} (${parsed.reason})`,
    });
    sendSuccess(res, { product });
  } catch (err) {
    next(err);
  }
}
