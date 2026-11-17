import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, SearchFilterBar } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { ROLE_PERMISSIONS, type Permission, type RoleName } from '../../../lib/rbac';
import { useSeoMeta } from '../../../lib/useSeoMeta';

const STAFF_ROLES: Exclude<RoleName, 'customer'>[] = [
  'super_admin',
  'admin',
  'order_manager',
  'inventory_manager',
  'catalog_manager',
  'customer_support',
  'finance_accounts',
];

export function PermissionsPage() {
  useSeoMeta({ title: 'Permissions Matrix | NOVARA Admin', noIndex: true });

  const [rolesMap, setRolesMap] = useState<Record<string, Permission[]>>(ROLE_PERMISSIONS);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; roles: Record<string, Permission[]> }>('/api/admin/roles');
      if (res.roles) setRolesMap(res.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch live RBAC permissions matrix.');
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const allPermissions = ROLE_PERMISSIONS.super_admin;

  const modulePrefixes = useMemo(() => {
    const set = new Set<string>();
    allPermissions.forEach((p) => set.add(p.split('.')[0]));
    return Array.from(set).sort();
  }, [allPermissions]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPermissions.filter((perm) => {
      if (moduleFilter && !perm.startsWith(`${moduleFilter}.`)) return false;
      if (!q) return true;
      return perm.toLowerCase().includes(q);
    });
  }, [allPermissions, moduleFilter, search]);

  return (
    <AdminLayout>
      <PermissionGuard permission="staff.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Permissions Matrix"
            subtitle="Inspect capability scopes across every staff role. Individual overrides can be granted on Admin Users."
            breadcrumbs={[{ label: 'Admin & Roles' }, { label: 'Permissions' }]}
            actions={
              <Link
                to="/admin/admin-users"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <ShieldCheck className="h-4 w-4" /> Edit User Overrides
              </Link>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter permissions (e.g. orders, catalog, settings)..."
            filters={
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                aria-label="Filter by permission module"
                className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs capitalize text-[#101B35] dark:text-slate-100"
              >
                <option value="">All Modules</option>
                {modulePrefixes.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadPermissions} />}

          <div className="overflow-x-auto rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-[#0F1D3A] text-[#64748B] dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold min-w-[210px]">Permission Capability</th>
                  {STAFF_ROLES.map((role) => (
                    <th key={role} className="px-3 py-3 text-center font-semibold capitalize whitespace-nowrap">
                      {role.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPermissions.map((perm) => (
                  <tr key={perm} className="hover:bg-[#F4F7FF]/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono-tabular font-semibold text-[#101B35] dark:text-white">
                      {perm}
                    </td>
                    {STAFF_ROLES.map((role) => {
                      const allowed = (rolesMap[role] || []).includes(perm);
                      return (
                        <td key={`${perm}-${role}`} className="px-3 py-2.5 text-center">
                          {allowed ? (
                            <span
                              aria-label={`${role} has ${perm}`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span
                              aria-label={`${role} lacks ${perm}`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredPermissions.length === 0 && (
                  <tr>
                    <td colSpan={STAFF_ROLES.length + 1} className="px-4 py-8 text-center text-slate-400">
                      No permissions match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
