export type RoleName =
  | 'customer'
  | 'super_admin'
  | 'admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'catalog_manager'
  | 'customer_support'
  | 'finance_accounts';

export type Permission =
  | 'dashboard.view'
  | 'catalog.view'
  | 'catalog.manage'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'orders.view'
  | 'orders.manage_fulfillment'
  | 'orders.cancel'
  | 'payments.view'
  | 'payments.reconcile'
  | 'refunds.manage'
  | 'customers.view'
  | 'reviews.moderate'
  | 'marketing.manage'
  | 'cms.manage'
  | 'ads.manage'
  | 'reports.view'
  | 'support.manage'
  | 'staff.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'logs.view'
  | 'system.view';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'catalog.view',
  'catalog.manage',
  'inventory.view',
  'inventory.adjust',
  'orders.view',
  'orders.manage_fulfillment',
  'orders.cancel',
  'payments.view',
  'payments.reconcile',
  'refunds.manage',
  'customers.view',
  'reviews.moderate',
  'marketing.manage',
  'cms.manage',
  'ads.manage',
  'reports.view',
  'support.manage',
  'staff.manage',
  'settings.manage',
  'audit.view',
  'logs.view',
  'system.view',
];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  customer: [],
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((p) => p !== 'staff.manage'),
  order_manager: [
    'dashboard.view',
    'orders.view',
    'orders.manage_fulfillment',
    'orders.cancel',
    'inventory.view',
    'customers.view',
  ],
  inventory_manager: [
    'dashboard.view',
    'catalog.view',
    'inventory.view',
    'inventory.adjust',
    'reports.view',
  ],
  catalog_manager: [
    'dashboard.view',
    'catalog.view',
    'catalog.manage',
    'marketing.manage',
    'cms.manage',
    'ads.manage',
    'reviews.moderate',
  ],
  customer_support: [
    'dashboard.view',
    'orders.view',
    'customers.view',
    'reviews.moderate',
    'support.manage',
  ],
  finance_accounts: [
    'dashboard.view',
    'orders.view',
    'payments.view',
    'payments.reconcile',
    'refunds.manage',
    'reports.view',
  ],
};

export function hasPermission(role: RoleName | undefined | null, permission: Permission, customPermissions?: string[]): boolean {
  if (!role || role === 'customer') return false;
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  if (rolePerms.includes(permission)) return true;
  if (customPermissions && customPermissions.includes(permission)) return true;
  return false;
}

export function isStaffRole(role: RoleName | undefined | null): boolean {
  return Boolean(role && role !== 'customer');
}
