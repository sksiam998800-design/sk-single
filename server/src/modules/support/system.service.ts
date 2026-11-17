import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../users/user.model';
import { OrderModel } from '../orders/order.model';
import { ProductModel } from '../products/product.model';
import { CategoryModel, BrandModel } from '../categories/category.model';
import { CouponModel } from '../coupons/coupon.model';
import { PromotionalAdModel } from '../cms/cms.model';
import { AuditLogModel, SystemLogModel } from './support.model';
import { AppError } from '../../middleware/error.middleware';
import { env, integrations } from '../../config/env';

export async function listStaffAdmin() {
  const staff = await UserModel.find({ role: { $ne: 'customer' } })
    .select('name email phone role status customPermissions lastLoginAt createdAt')
    .sort({ createdAt: -1 })
    .lean();
  return staff.map((s) => ({ ...s, id: String(s._id) }));
}

export async function createStaffAdmin(input: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'order_manager' | 'inventory_manager' | 'catalog_manager' | 'customer_support' | 'finance_accounts';
  customPermissions: string[];
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const staff = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    customPermissions: input.customPermissions,
    isVerified: true,
    status: 'active',
  });
  return {
    id: String(staff._id),
    name: staff.name,
    email: staff.email,
    role: staff.role,
    status: staff.status,
    customPermissions: staff.customPermissions,
  };
}

export async function updateStaffAdmin(params: {
  id: string;
  actorId: string;
  role: 'super_admin' | 'admin' | 'order_manager' | 'inventory_manager' | 'catalog_manager' | 'customer_support' | 'finance_accounts';
  status: 'active' | 'suspended';
  customPermissions?: string[];
}) {
  const existing = await UserModel.findById(params.id).select('role status email');
  if (!existing) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');

  if (params.id === params.actorId) {
    if (params.status === 'suspended') {
      throw new AppError(400, 'SELF_SUSPEND_FORBIDDEN', 'You cannot suspend your own active account.');
    }
    if (existing.role === 'super_admin' && params.role !== 'super_admin') {
      throw new AppError(400, 'SELF_DEMOTE_FORBIDDEN', 'You cannot demote your own Super Admin account.');
    }
  }

  if (existing.role === 'super_admin' && (params.role !== 'super_admin' || params.status === 'suspended')) {
    const otherActiveSuper = await UserModel.countDocuments({
      role: 'super_admin',
      status: 'active',
      _id: { $ne: existing._id },
    });
    if (otherActiveSuper === 0) {
      throw new AppError(400, 'LAST_SUPER_ADMIN', 'Cannot demote or suspend the only active Super Admin account.');
    }
  }

  const updateDoc: Record<string, unknown> = { role: params.role, status: params.status };
  if (params.customPermissions !== undefined) {
    updateDoc.customPermissions = params.customPermissions;
  }

  const updated = await UserModel.findByIdAndUpdate(params.id, { $set: updateDoc }, { new: true }).select(
    'name email role status customPermissions',
  );
  if (!updated) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteStaffAdmin(id: string, actorId: string) {
  if (id === actorId) {
    throw new AppError(400, 'SELF_DELETE_FORBIDDEN', 'You cannot delete your own account.');
  }
  const staff = await UserModel.findOne({ _id: id, role: { $ne: 'customer' } });
  if (!staff) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
  if (staff.role === 'super_admin') {
    const otherSuper = await UserModel.countDocuments({ role: 'super_admin', _id: { $ne: staff._id } });
    if (otherSuper === 0) {
      throw new AppError(400, 'LAST_SUPER_ADMIN', 'Cannot delete the only Super Admin account.');
    }
  }
  const email = staff.email;
  await staff.deleteOne();
  return { id, email };
}

export async function listAuditLogsAdmin() {
  const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(100).lean();
  return logs.map((l) => ({ ...l, id: String(l._id) }));
}

export async function listSystemLogsAdmin(type: string) {
  const [auditLogs, systemLogs] = await Promise.all([
    type === 'system' ? Promise.resolve([]) : AuditLogModel.find().sort({ createdAt: -1 }).limit(100).lean(),
    type === 'audit' ? Promise.resolve([]) : SystemLogModel.find().sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return {
    auditLogs: auditLogs.map((l) => ({ ...l, id: String(l._id) })),
    systemLogs: systemLogs.map((l) => ({ ...l, id: String(l._id) })),
  };
}

export async function getSystemHealthDiagnostics() {
  const pingStart = Date.now();
  let dbLatencyMs: number | null = null;
  try {
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Date.now() - pingStart;
    }
  } catch {
    dbLatencyMs = null;
  }

  const [productsCount, categoriesCount, brandsCount, ordersCount, usersCount, couponsCount, adsCount, auditCount] =
    await Promise.all([
      ProductModel.countDocuments(),
      CategoryModel.countDocuments(),
      BrandModel.countDocuments(),
      OrderModel.countDocuments(),
      UserModel.countDocuments(),
      CouponModel.countDocuments(),
      PromotionalAdModel.countDocuments(),
      AuditLogModel.countDocuments(),
    ]);

  const mem = process.memoryUsage();
  return {
    database: {
      readyState: mongoose.connection.readyState,
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'novara',
      host: mongoose.connection.host || 'atlas',
      latencyMs: dbLatencyMs,
      collections: {
        products: productsCount,
        categories: categoriesCount,
        brands: brandsCount,
        orders: ordersCount,
        users: usersCount,
        coupons: couponsCount,
        ads: adsCount,
        auditLogs: auditCount,
      },
    },
    server: {
      nodeVersion: process.version,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    integrations,
  };
}
