import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { ROLE_PERMISSIONS, type Permission, type RoleName } from '../../../lib/rbac';
import type { StaffMemberRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

const ALL_PERMISSIONS: Permission[] = ROLE_PERMISSIONS.super_admin;

const STAFF_ROLE_OPTIONS: Array<{ value: Exclude<RoleName, 'customer'>; label: string }> = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'order_manager', label: 'Order Manager' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'catalog_manager', label: 'Catalog Manager' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'finance_accounts', label: 'Finance & Accounts' },
];

export function AdminUsersPage() {
  useSeoMeta({ title: 'Admin Users & Staff | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [staff, setStaff] = useState<StaffMemberRecord[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'order_manager' as Exclude<RoleName, 'customer' | 'super_admin'>,
    customPermissions: [] as Permission[],
  });

  const [editTarget, setEditTarget] = useState<StaffMemberRecord | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editRole, setEditRole] = useState<Exclude<RoleName, 'customer'>>('order_manager');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editCustomPerms, setEditCustomPerms] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<StaffMemberRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; staff: StaffMemberRecord[] }>('/api/admin/staff');
      setStaff(res.staff || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((member) => {
      if (roleFilter && member.role !== roleFilter) return false;
      if (!q) return true;
      return `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(q);
    });
  }, [staff, search, roleFilter]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      dispatch(showToast({ variant: 'success', message: 'Admin user account created.' }));
      setCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'order_manager',
        customPermissions: [],
      });
      loadStaff();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to create staff user.' }));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setUpdating(true);
    try {
      await apiRequest(`/api/admin/staff/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
          customPermissions: editCustomPerms,
        }),
      });
      dispatch(showToast({ variant: 'success', message: 'Admin role and permissions updated.' }));
      setEditTarget(null);
      loadStaff();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/staff/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: `Removed ${deleteTarget.email} from staff.` }));
      setDeleteTarget(null);
      loadStaff();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to delete admin user.' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="staff.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Admin Users"
            subtitle="Provision administrative accounts, assign RBAC roles, and customize per-user permission overrides."
            breadcrumbs={[{ label: 'Admin & Roles' }, { label: 'Admin Users' }]}
            actions={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Admin User
              </button>
            }
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by staff name or email..."
            filters={
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by staff role"
                className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs text-[#101B35] dark:text-slate-100"
              >
                <option value="">All Roles</option>
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadStaff} />}

          <DataTable<StaffMemberRecord>
            rows={filteredStaff}
            rowKey={(m) => m.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Users className="h-6 w-6" />}
                title="No admin users found"
                description="Provision your team accounts with least-privilege RBAC roles."
              />
            }
            columns={[
              {
                key: 'member',
                header: 'Staff Member',
                render: (m) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {currentUser?.id === m.id && (
                        <StatusBadge label="You" tone="blue" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400">{m.email}</div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Assigned Role',
                render: (m) => (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF1FF] dark:bg-blue-950/50 px-2 py-0.5 text-[11px] font-semibold capitalize text-[#145CFF] dark:text-blue-300">
                    <ShieldCheck className="h-3 w-3" />
                    {m.role.replace(/_/g, ' ')}
                  </span>
                ),
              },
              {
                key: 'overrides',
                header: 'Custom Permissions',
                render: (m) => (
                  <span className="text-xs text-[#64748B] dark:text-slate-300">
                    {m.customPermissions && m.customPermissions.length > 0
                      ? `${m.customPermissions.length} custom override${m.customPermissions.length === 1 ? '' : 's'}`
                      : 'Role defaults'}
                  </span>
                ),
              },
              {
                key: 'lastLogin',
                header: 'Last Login',
                render: (m) => (
                  <span className="font-mono-tabular text-[11px] text-[#64748B] dark:text-slate-400">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (m) => <StatusBadge label={m.status || 'active'} tone={statusToTone(m.status || 'active')} />,
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (m) => {
                  const isSelf = currentUser?.id === m.id;
                  return (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(m);
                          setEditRole(m.role === 'customer' ? 'order_manager' : m.role);
                          setEditStatus(m.status || 'active');
                          setEditCustomPerms(m.customPermissions || []);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-[#145CFF] hover:bg-[#EAF1FF]/60 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setDeleteTarget(m)}
                        title={isSelf ? 'Cannot delete your own active account' : 'Delete admin user'}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />

          <Modal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            title="Create Admin User"
            description="Assign role-based access and optional custom permission overrides."
            size="lg"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Full Name</label>
                  <input
                    required
                    minLength={2}
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Tariq Mahmud"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#145CFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Email Address</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="staff@novara.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#145CFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Initial Password</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#145CFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Primary Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        role: e.target.value as Exclude<RoleName, 'customer' | 'super_admin'>,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#145CFF] focus:outline-none"
                  >
                    {STAFF_ROLE_OPTIONS.filter((r) => r.value !== 'super_admin').map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">Additional Custom Permissions (Optional)</p>
                <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs sm:grid-cols-3">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = createForm.customPermissions.includes(perm);
                    return (
                      <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              customPermissions: e.target.checked
                                ? [...f.customPermissions, perm]
                                : f.customPermissions.filter((p) => p !== perm),
                            }))
                          }
                          className="rounded border-slate-300 text-[#145CFF]"
                        />
                        <span className="font-mono-tabular text-[11px] text-slate-700">{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Admin User'}
                </button>
              </div>
            </form>
          </Modal>

          <Modal
            open={Boolean(editTarget)}
            onClose={() => setEditTarget(null)}
            title={`Edit Access · ${editTarget?.name || ''}`}
            size="lg"
          >
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Exclude<RoleName, 'customer'>)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">Additional Custom Permissions</p>
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs sm:grid-cols-3">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = editCustomPerms.includes(perm);
                    return (
                      <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setEditCustomPerms((prev) =>
                              e.target.checked ? [...prev, perm] : prev.filter((p) => p !== perm),
                            )
                          }
                          className="rounded border-slate-300 text-[#145CFF]"
                        />
                        <span className="font-mono-tabular text-[11px] text-slate-700">{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Remove Admin User"
            message={`Are you sure you want to delete ${deleteTarget?.name || ''} (${deleteTarget?.email || ''})? This immediately revokes access.`}
            confirmLabel="Delete Account"
            destructive
            loading={deleting}
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
