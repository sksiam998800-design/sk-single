import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, Percent, Plus, Trash2 } from 'lucide-react';
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
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface DiscountRuleRecord {
  id: string;
  name: string;
  description?: string;
  ruleType: 'percentage' | 'fixed' | 'bulk';
  value: number;
  minQty: number;
  minSpend: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export function DiscountRulesPage() {
  useSeoMeta({ title: 'Discount Rules | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [rules, setRules] = useState<DiscountRuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<'percentage' | 'fixed' | 'bulk'>('percentage');
  const [value, setValue] = useState('10');
  const [minQty, setMinQty] = useState('1');
  const [minSpend, setMinSpend] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountRuleRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; rules: DiscountRuleRecord[] }>('/api/admin/promotions/rules');
      setRules(res.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load discount rules.');
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
    setDescription('');
    setRuleType('percentage');
    setValue('10');
    setMinQty('1');
    setMinSpend('0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (r: DiscountRuleRecord) => {
    setEditingId(r.id);
    setName(r.name);
    setDescription(r.description || '');
    setRuleType(r.ruleType);
    setValue(String(r.value));
    setMinQty(String(r.minQty));
    setMinSpend(String(r.minSpend));
    setIsActive(r.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        ruleType,
        value: Number(value),
        minQty: Number(minQty || 1),
        minSpend: Number(minSpend || 0),
        isActive,
      };
      if (editingId) {
        await apiRequest(`/api/admin/promotions/rules/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Discount rule updated.' }));
      } else {
        await apiRequest('/api/admin/promotions/rules', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Discount rule created.' }));
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
      await apiRequest(`/api/admin/promotions/rules/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Discount rule deleted.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="marketing.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Discount Rules"
            subtitle="Configure automatic cart-level percentage, fixed, and multi-quantity bulk pricing rules."
            breadcrumbs={[{ label: 'Coupons & Offers' }, { label: 'Discount Rules' }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Rule
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<DiscountRuleRecord>
            rows={rules}
            rowKey={(r) => r.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Percent className="h-6 w-6" />}
                title="No discount rules configured"
                description="Create automatic threshold rules without requiring customers to enter a promo code."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Add Rule
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'name',
                header: 'Rule Name',
                render: (r) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{r.name}</div>
                    {r.description && <div className="text-[11px] text-[#64748B]">{r.description}</div>}
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (r) => <StatusBadge label={r.ruleType} tone="blue" />,
              },
              {
                key: 'value',
                header: 'Value & Threshold',
                render: (r) => (
                  <div>
                    <div className="font-mono-tabular font-bold">
                      {r.ruleType === 'fixed' ? `৳${r.value}` : `${r.value}%`} OFF
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Min Qty: {r.minQty} · Min Spend: ৳{r.minSpend.toLocaleString('en-IN')}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <StatusBadge label={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
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
            title={editingId ? 'Edit Discount Rule' : 'Create Discount Rule'}
            size="md"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Rule Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as typeof ruleType)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="bulk">Bulk Quantity</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Discount Value *</label>
                  <input
                    type="number"
                    min={1}
                    max={ruleType !== 'fixed' ? 100 : undefined}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Min Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Min Cart Spend (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Rule Active
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
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Discount Rule"
            message={`Delete rule "${deleteTarget?.name}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
