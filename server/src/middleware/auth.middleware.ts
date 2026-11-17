import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { UserModel, type IUser } from '../modules/users/user.model';
import { AuditLogModel } from '../modules/support/support.model';
import { hasPermission, type Permission, type RoleName } from '../../../src/lib/rbac';

export interface AuthJwtPayload {
  userId: string;
  role: RoleName;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function signAuthToken(user: { _id: unknown; role: RoleName; email: string }): string {
  const payload: AuthJwtPayload = {
    userId: String(user._id),
    role: user.role,
    email: user.email,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies.novara_token) {
    return String(req.cookies.novara_token);
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function authenticateOptional(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }
    const decoded = jwt.verify(token, getJwtSecret()) as AuthJwtPayload;
    const user = await UserModel.findById(decoded.userId);
    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch {
    // Invalid or expired optional token simply leaves req.user undefined
  }
  next();
}

export async function authenticateRequired(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Authentication required. Please sign in.' });
      return;
    }
    const decoded = jwt.verify(token, getJwtSecret()) as AuthJwtPayload;
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Account not found. Please sign in again.' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ ok: false, code: 'ACCOUNT_SUSPENDED', error: 'This account has been suspended.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ ok: false, code: 'INVALID_TOKEN', error: 'Session expired or invalid. Please sign in again.' });
  }
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Authentication required.' });
      return;
    }
    if (!hasPermission(req.user.role, permission, req.user.customPermissions)) {
      res.status(403).json({
        ok: false,
        code: 'FORBIDDEN',
        error: `Insufficient permissions. Required permission: ${permission}`,
      });
      return;
    }
    next();
  };
}

export async function recordAuditLog(params: {
  actor?: IUser | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLogModel.create({
      actorId: params.actor?._id ?? null,
      actorName: params.actor?.name || params.actorName || 'System',
      actorRole: params.actor?.role || params.actorRole || 'system',
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      summary: params.summary,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('[NOVARA AUDIT] Failed to write audit log:', err);
  }
}
