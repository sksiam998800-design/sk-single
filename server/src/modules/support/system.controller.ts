import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { ROLE_PERMISSIONS } from '../../../../src/lib/rbac';
import {
  createStaffAdmin,
  deleteStaffAdmin,
  getSystemHealthDiagnostics,
  listAuditLogsAdmin,
  listStaffAdmin,
  listSystemLogsAdmin,
  updateStaffAdmin,
} from './system.service';

export function getRolesController(_req: AuthenticatedRequest, res: Response) {
  sendSuccess(res, { roles: ROLE_PERMISSIONS });
}

export async function listStaffController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const staff = await listStaffAdmin();
    sendSuccess(res, { staff });
  } catch (err) {
    next(err);
  }
}

export async function createStaffController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().toLowerCase(),
        password: z.string().min(8).max(128),
        role: z.enum([
          'admin',
          'order_manager',
          'inventory_manager',
          'catalog_manager',
          'customer_support',
          'finance_accounts',
        ]),
        customPermissions: z.array(z.string()).default([]),
      })
      .parse(req.body);
    const staff = await createStaffAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'staff.create',
      resourceType: 'User',
      resourceId: staff.id,
      summary: `Created staff member ${staff.email} with role ${staff.role}`,
    });
    sendCreated(res, { staff });
  } catch (err) {
    next(err);
  }
}

export async function updateStaffController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = z
      .object({
        role: z.enum([
          'super_admin',
          'admin',
          'order_manager',
          'inventory_manager',
          'catalog_manager',
          'customer_support',
          'finance_accounts',
        ]),
        status: z.enum(['active', 'suspended']),
        customPermissions: z.array(z.string()).optional(),
      })
      .parse(req.body);
    const staff = await updateStaffAdmin({
      id: req.params.id,
      actorId: String(req.user!._id),
      role: parsed.role,
      status: parsed.status,
      customPermissions: parsed.customPermissions,
    });
    await recordAuditLog({
      actor: req.user,
      action: 'staff.role_update',
      resourceType: 'User',
      resourceId: staff.id,
      summary: `Updated staff ${staff.email} -> role=${staff.role}, status=${staff.status}`,
    });
    sendSuccess(res, { staff });
  } catch (err) {
    next(err);
  }
}

export async function deleteStaffController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id, email } = await deleteStaffAdmin(req.params.id, String(req.user!._id));
    await recordAuditLog({
      actor: req.user,
      action: 'staff.delete',
      resourceType: 'User',
      resourceId: id,
      summary: `Deleted staff member ${email}`,
    });
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const logs = await listAuditLogsAdmin();
    sendSuccess(res, { logs });
  } catch (err) {
    next(err);
  }
}

export async function listSystemLogsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const type = String(req.query.type || 'all');
    const data = await listSystemLogsAdmin(type);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function systemHealthController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const health = await getSystemHealthDiagnostics();
    sendSuccess(res, health);
  } catch (err) {
    next(err);
  }
}
