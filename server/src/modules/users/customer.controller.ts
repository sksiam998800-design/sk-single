import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { hasPermission } from '../../../../src/lib/rbac';
import {
  createCustomerGroupAdmin,
  deleteCustomerGroupAdmin,
  getCustomerByIdAdmin,
  listCustomerGroupsAdmin,
  listCustomersAdmin,
  updateCustomerGroupAdmin,
  updateCustomerStatusAdmin,
} from './customer.service';

const customerGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).toLowerCase(),
  description: z.string().max(300).optional(),
  discountPercent: z.number().min(0).max(90).default(0),
  minOrders: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function listCustomersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim() || undefined;
    const groupId = String(req.query.groupId || '').trim() || undefined;
    const isVerified = String(req.query.isVerified || '').trim() || undefined;
    const provider = String(req.query.provider || '').trim() || undefined;
    const role = String(req.query.role || '').trim() || 'all';
    const rawSort = String(req.query.sortBy || 'newest').trim();
    const sortBy = (['newest', 'oldest', 'name', 'lastLogin'].includes(rawSort) ? rawSort : 'newest') as
      | 'newest'
      | 'oldest'
      | 'name'
      | 'lastLogin';

    const data = await listCustomersAdmin({ page, limit, q, status, groupId, isVerified, provider, role, sortBy });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getCustomerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getCustomerByIdAdmin(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = z
      .object({
        status: z.enum(['active', 'suspended']).optional(),
        customerGroupId: z.string().nullable().optional(),
        notes: z.string().max(600).optional(),
        role: z
          .enum([
            'customer',
            'admin',
            'order_manager',
            'inventory_manager',
            'catalog_manager',
            'customer_support',
            'finance_accounts',
          ])
          .optional(),
      })
      .parse(req.body);

    const canManageStaff = hasPermission(req.user!.role, 'staff.manage', req.user!.customPermissions);
    if (parsed.role !== undefined && !canManageStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Only administrators with staff.manage permission can change user roles.');
    }

    const customer = await updateCustomerStatusAdmin({
      id: req.params.id,
      actorId: String(req.user!._id),
      canManageStaff,
      ...parsed,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'customer.update',
      resourceType: 'User',
      resourceId: customer.id,
      summary: `Updated user ${customer.email} (status=${customer.status}, role=${customer.role})`,
    });
    sendSuccess(res, { customer });
  } catch (err) {
    next(err);
  }
}

export async function listCustomerGroupsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const groups = await listCustomerGroupsAdmin();
    sendSuccess(res, { groups });
  } catch (err) {
    next(err);
  }
}

export async function createCustomerGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = customerGroupSchema.parse(req.body);
    const group = await createCustomerGroupAdmin(parsed);
    sendCreated(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = customerGroupSchema.parse(req.body);
    const group = await updateCustomerGroupAdmin(req.params.id, parsed);
    sendSuccess(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomerGroupController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteCustomerGroupAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
