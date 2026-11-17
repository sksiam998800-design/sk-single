import { UserModel, CustomerGroupModel } from './user.model';
import { OrderModel } from '../orders/order.model';
import { AddressModel } from '../addresses/address.model';
import { AppError } from '../../middleware/error.middleware';
import type { RoleName } from '../../../../src/lib/rbac';

function deriveAuthProvider(user: {
  authProvider?: 'local' | 'google' | 'facebook';
  oauthProviders?: { googleId?: string; facebookId?: string };
}): 'local' | 'google' | 'facebook' {
  if (user.authProvider) return user.authProvider;
  if (user.oauthProviders?.googleId) return 'google';
  if (user.oauthProviders?.facebookId) return 'facebook';
  return 'local';
}

export async function listCustomersAdmin(params: {
  page: number;
  limit: number;
  q: string;
  status?: string;
  groupId?: string;
  isVerified?: string;
  provider?: string;
  role?: string;
  sortBy?: 'newest' | 'oldest' | 'name' | 'lastLogin';
}) {
  const { page, limit, q, status, groupId, isVerified, provider, role, sortBy = 'newest' } = params;
  const filter: Record<string, unknown> = {};

  if (role && role !== 'all') {
    filter.role = role;
  } else if (!role) {
    filter.role = 'customer';
  }

  if (status) filter.status = status;
  if (groupId) filter.customerGroupId = groupId;
  if (isVerified === 'true') filter.isVerified = true;
  if (isVerified === 'false') filter.isVerified = { $ne: true };
  if (provider === 'google') {
    filter.$or = [{ authProvider: 'google' }, { 'oauthProviders.googleId': { $exists: true, $ne: null } }];
  } else if (provider === 'facebook') {
    filter.$or = [{ authProvider: 'facebook' }, { 'oauthProviders.facebookId': { $exists: true, $ne: null } }];
  } else if (provider === 'local') {
    filter.authProvider = { $in: ['local', null] };
    filter['oauthProviders.googleId'] = { $exists: false };
    filter['oauthProviders.facebookId'] = { $exists: false };
  }

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchClause = [{ name: regex }, { email: regex }, { phone: regex }];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchClause }];
      delete filter.$or;
    } else {
      filter.$or = searchClause;
    }
  }

  const sortSpec: Record<string, 1 | -1> =
    sortBy === 'oldest'
      ? { createdAt: 1 }
      : sortBy === 'name'
        ? { name: 1 }
        : sortBy === 'lastLogin'
          ? { lastLoginAt: -1, createdAt: -1 }
          : { createdAt: -1 };

  const [total, customers, orderAgg] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .populate('customerGroupId', 'name discountPercent')
      .select('name email phone role isVerified status authProvider oauthProviders customerGroupId notes createdAt lastLoginAt')
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrderModel.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$userId', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
    ]),
  ]);

  const aggMap = new Map(orderAgg.map((a) => [String(a._id), a]));

  return {
    customers: customers.map((c) => {
      const stats = aggMap.get(String(c._id));
      const { oauthProviders: oauthMeta, ...safeUser } = c;
      return {
        ...safeUser,
        id: String(c._id),
        authProvider: deriveAuthProvider({ authProvider: c.authProvider, oauthProviders: oauthMeta }),
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getCustomerByIdAdmin(id: string) {
  const customer = await UserModel.findById(id)
    .populate('customerGroupId', 'name discountPercent')
    .select('name email phone role isVerified status authProvider oauthProviders customerGroupId notes createdAt lastLoginAt')
    .lean();
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'User account not found.');

  const [orders, addresses] = await Promise.all([
    OrderModel.find({ userId: customer._id })
      .sort({ createdAt: -1 })
      .limit(40)
      .select('orderNumber total orderStatus paymentStatus paymentMethod createdAt items')
      .lean(),
    AddressModel.find({ userId: customer._id }).lean(),
  ]);

  const totalSpent = orders.filter((o) => o.orderStatus !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const { oauthProviders: oauthMeta, ...safeCustomer } = customer;

  return {
    customer: {
      ...safeCustomer,
      id: String(customer._id),
      authProvider: deriveAuthProvider({ authProvider: customer.authProvider, oauthProviders: oauthMeta }),
      orderCount: orders.length,
      totalSpent,
    },
    orders: orders.map((o) => ({ ...o, id: String(o._id) })),
    addresses: addresses.map((a) => ({ ...a, id: String(a._id) })),
  };
}

export async function updateCustomerStatusAdmin(params: {
  id: string;
  actorId: string;
  canManageStaff?: boolean;
  status?: 'active' | 'suspended';
  customerGroupId?: string | null;
  notes?: string;
  role?: RoleName;
}) {
  const target = await UserModel.findById(params.id).select('role status email');
  if (!target) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'User account not found.');

  if (target.role !== 'customer' && (params.status !== undefined || params.role !== undefined) && !params.canManageStaff) {
    throw new AppError(403, 'FORBIDDEN', 'Only administrators with staff.manage permission can modify staff accounts.');
  }
  if (String(target._id) === params.actorId && (params.status === 'suspended' || (params.role && params.role !== target.role))) {
    throw new AppError(400, 'SELF_MODIFICATION_FORBIDDEN', 'You cannot suspend or downgrade your own active administrator account.');
  }
  if (target.role === 'super_admin' && (params.status === 'suspended' || (params.role && params.role !== 'super_admin'))) {
    throw new AppError(403, 'PROTECTED_ROLE', 'Super Admin accounts cannot be suspended or demoted from customer controls.');
  }

  const patch: Record<string, unknown> = {};
  if (params.status !== undefined) patch.status = params.status;
  if (params.customerGroupId !== undefined) patch.customerGroupId = params.customerGroupId || null;
  if (params.notes !== undefined) patch.notes = params.notes;
  if (params.role !== undefined) patch.role = params.role;

  const updated = await UserModel.findByIdAndUpdate(
    params.id,
    { $set: patch },
    { new: true },
  )
    .populate('customerGroupId', 'name discountPercent')
    .select('name email phone role isVerified status authProvider oauthProviders customerGroupId notes createdAt lastLoginAt');

  if (!updated) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'User account not found.');
  const obj = updated.toObject();
  const { oauthProviders: oauthMeta, ...safeObj } = obj;
  return {
    ...safeObj,
    id: String(updated._id),
    authProvider: deriveAuthProvider({ authProvider: obj.authProvider, oauthProviders: oauthMeta }),
  };
}

export async function listCustomerGroupsAdmin() {
  const groups = await CustomerGroupModel.find().sort({ discountPercent: 1, name: 1 }).lean();
  return groups.map((g) => ({ ...g, id: String(g._id) }));
}

export async function createCustomerGroupAdmin(input: {
  name: string;
  slug: string;
  description?: string;
  discountPercent: number;
  minOrders: number;
  isActive: boolean;
}) {
  const group = await CustomerGroupModel.create(input);
  return { ...group.toObject(), id: String(group._id) };
}

export async function updateCustomerGroupAdmin(
  id: string,
  input: {
    name: string;
    slug: string;
    description?: string;
    discountPercent: number;
    minOrders: number;
    isActive: boolean;
  },
) {
  const updated = await CustomerGroupModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'GROUP_NOT_FOUND', 'Customer group not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteCustomerGroupAdmin(id: string) {
  const deleted = await CustomerGroupModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'GROUP_NOT_FOUND', 'Customer group not found.');
  await UserModel.updateMany({ customerGroupId: deleted._id }, { $set: { customerGroupId: null } });
  return { deleted: true };
}
