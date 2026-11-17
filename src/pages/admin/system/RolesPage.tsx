import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { ROLE_PERMISSIONS, type Permission } from '../../../lib/rbac';
import { useSeoMeta } from '../../../lib/useSeoMeta';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Unrestricted platform governance including admin user provisioning and security settings.',
  admin: 'Full catalog, order fulfillment, customer, CMS, marketing, analytics, and settings administration.',
  order_manager: 'Process customer orders, dispatch couriers, handle cancellations, and view inventory stock.',
  inventory_manager: 'Monitor catalog stock levels, run inventory adjustments, and review stock movement history.',
  catalog_manager: 'Manage products, categories, brands, hero slides, banners, ads, reviews, and storefront CMS.',
  customer_support: 'Manage customer profiles, moderate product reviews, and resolve customer support enquiries.',
  finance_accounts: 'Audit payment transactions, reconcile gateways, process returns/refunds, and view financial reports.',
};

export function RolesPage() {
  useSeoMeta({ title: 'Roles & Access Levels | NOVARA Admin', noIndex: true });

  const [rolesMap, setRolesMap] = useState<Record<string, Permission[]>>(ROLE_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; roles: Record<string, Permission[]> }>('/api/admin/roles');
      if (res.roles) setRolesMap(res.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync live roles matrix.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const staffRoles = Object.entries(rolesMap).filter(([role]) => role !== 'customer');

  return (
    <AdminLayout>
      <PermissionGuard permission="staff.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Roles & Access Levels"
            subtitle="Authoritative RBAC role definitions enforced across server middleware and admin navigation."
            breadcrumbs={[{ label: 'Admin & Roles' }, { label: 'Roles' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/permissions"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  <KeyRound className="h-3.5 w-3.5 text-[#145CFF]" /> Permission Matrix
                </Link>
                <Link
                  to="/admin/admin-users"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                >
                  <Users className="h-3.5 w-3.5" /> Assign Staff Roles
                </Link>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadRoles} />}

          {loading ? (
            <LoadingCards count={4} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {staffRoles.map(([role, perms]) => (
                <section
                  key={role}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1FF] dark:bg-blue-950/50 text-[#145CFF]">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="font-display text-sm font-bold capitalize text-[#101B35] dark:text-white">
                          {role.replace(/_/g, ' ')}
                        </h2>
                        <p className="text-[11px] font-mono-tabular text-[#64748B] dark:text-slate-400">{role}</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-[#EAF1FF] dark:bg-blue-950/60 px-2.5 py-1 text-[11px] font-bold text-[#145CFF] dark:text-blue-300 shrink-0">
                      {perms.length} permissions
                    </span>
                  </div>

                  {ROLE_DESCRIPTIONS[role] && (
                    <p className="mt-3 text-xs leading-relaxed text-[#64748B] dark:text-slate-300">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <span
                        key={perm}
                        className="font-mono-tabular rounded-md border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 py-0.5 text-[11px] text-[#101B35] dark:text-slate-300"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
