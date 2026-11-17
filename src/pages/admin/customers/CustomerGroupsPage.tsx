import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Award, Edit3, Plus, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
} from '../../../components/admin/ui';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { CustomerGroupRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CustomerGroupsPage() {
  useSeoMeta({ title: 'Customer Groups | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [groups, setGroups] = useState<CustomerGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState('5');
  const [minOrders, setMinOrders] = useState('3');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CustomerGroupRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; groups: CustomerGroupRecord[] }>('/api/admin/customer-groups');
      setGroups(res.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customer groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setDiscountPercent('5');
    setMinOrders('3');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (g: CustomerGroupRecord) => {
    setEditingId(g.id);
    setName(g.name);
    setSlug(g.slug);
    setDescription(g.description || '');
    setDiscountPercent(String(g.discountPercent));
    setMinOrders(String(g.minOrders));
    setIsActive(g.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: (slug.trim() || slugify(name)).toLowerCase(),
        description: description.trim(),
        discountPercent: Number(discountPercent || 0),
        minOrders: Number(minOrders || 0),
        isActive,
      };
      if (editingId) {
        await apiRequest(`/api/admin/customer-groups/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Customer group updated.' }));
      } else {
        await apiRequest('/api/admin/customer-groups', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Customer group created.' }));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/customer-groups/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Customer group removed.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="customers.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Customer Groups"
            subtitle="Define loyalty tiers, B2B wholesale groups, and automatic group discount thresholds."
            breadcrumbs={[{ label: 'Customer' }, { label: 'Customer Groups' }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Customer Group
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<CustomerGroupRecord>
            rows={groups}
            rowKey={(g) => g.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Award className="h-6 w-6" />}
                title="No customer groups created"
                description="Group VIP shoppers or corporate buyers to apply recurring loyalty benefits."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Add Group
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'name',
                header: 'Group Name',
                render: (g) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{g.name}</div>
                    <div className="font-mono-tabular text-[11px] text-[#64748B]">{g.slug}</div>
                  </div>
                ),
              },
              {
                key: 'discount',
                header: 'Tier Discount',
                render: (g) => <StatusBadge label={`${g.discountPercent}% OFF`} tone="blue" />,
              },
              {
                key: 'minOrders',
                header: 'Min Orders',
                align: 'center',
                render: (g) => <span className="font-mono-tabular font-semibold">{g.minOrders}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (g) => (
                  <StatusBadge label={g.isActive ? 'Active' : 'Inactive'} tone={g.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (g) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(g)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingId ? 'Edit Customer Group' : 'Create Customer Group'}
            size="md"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Group Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingId) setSlug(slugify(e.target.value));
                    }}
                    placeholder="VIP Platinum"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Slug *</label>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Discount Percent (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Min Completed Orders</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Active Group
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Customer Group"
            message={`Delete "${deleteTarget?.name}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
