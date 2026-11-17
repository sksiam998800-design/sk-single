import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { ReturnRequestRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function ReturnsRefundsPage() {
  useSeoMeta({ title: 'Returns & Refunds | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [returnsList, setReturnsList] = useState<ReturnRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<ReturnRequestRecord | null>(null);
  const [status, setStatus] = useState<'approved' | 'rejected' | 'received' | 'refunded'>('approved');
  const [restockEligible, setRestockEligible] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; returns: ReturnRequestRecord[] }>('/api/admin/returns');
      setReturnsList(res.returns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load return requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/returns/${target.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          restockEligible,
          inspectionNotes: inspectionNotes.trim() || undefined,
        }),
      });
      dispatch(showToast({ variant: 'success', message: `Return for ${target.orderNumber} updated to ${status}.` }));
      setTarget(null);
      setInspectionNotes('');
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="refunds.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Returns & Refunds"
            subtitle="Inspect RMA claims, verify restock eligibility, and mark verified refunds."
            breadcrumbs={[{ label: 'Sales & Orders' }, { label: 'Returns & Refunds' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<ReturnRequestRecord>
            rows={returnsList}
            rowKey={(r) => r.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<RotateCcw className="h-6 w-6" />}
                title="No return or refund requests"
                description="Submitted customer return claims will appear here for warehouse inspection and refund approval."
              />
            }
            columns={[
              {
                key: 'order',
                header: 'Order #',
                render: (r) => (
                  <div>
                    <Link
                      to={`/admin/orders/${r.orderId}`}
                      className="font-mono-tabular font-bold text-[#145CFF] hover:underline"
                    >
                      {r.orderNumber}
                    </Link>
                    <div className="text-[11px] text-[#64748B]">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                ),
              },
              {
                key: 'reason',
                header: 'Customer Reason',
                render: (r) => (
                  <div>
                    <div className="font-medium text-[#101B35] dark:text-white">{r.reason}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {r.items.length} line item{r.items.length === 1 ? '' : 's'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'refundAmount',
                header: 'Refund Amount',
                render: (r) => (
                  <span className="font-mono-tabular font-bold">৳{r.refundAmount.toLocaleString('en-IN')}</span>
                ),
              },
              {
                key: 'restocked',
                header: 'Restocked',
                render: (r) => (
                  <StatusBadge label={r.restocked ? 'Restocked' : 'Pending'} tone={r.restocked ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'status',
                header: 'Claim Status',
                render: (r) => <StatusBadge label={r.status} tone={statusToTone(r.status)} />,
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (r) => {
                  const isClosed = r.status === 'refunded' || r.status === 'rejected';
                  if (isClosed) {
                    return <StatusBadge label="Closed" tone={r.status === 'refunded' ? 'emerald' : 'rose'} />;
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setTarget(r);
                        setStatus(r.status === 'requested' ? 'approved' : r.status === 'approved' ? 'received' : 'refunded');
                        setRestockEligible(!r.restocked);
                        setInspectionNotes(r.inspectionNotes || '');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Inspect
                    </button>
                  );
                },
              },
            ]}
          />

          <Modal
            open={Boolean(target)}
            onClose={() => setTarget(null)}
            title={`Process Return · ${target?.orderNumber || ''}`}
            size="md"
          >
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Decision Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  {target?.status === 'requested' && <option value="approved">Approved for Return Pickup</option>}
                  {(target?.status === 'requested' || target?.status === 'approved') && (
                    <option value="received">Received at Warehouse</option>
                  )}
                  {(target?.status === 'approved' || target?.status === 'received') && (
                    <option value="refunded">Refund Issued (Completes Claim)</option>
                  )}
                  {target && target.status !== 'refunded' && target.status !== 'rejected' && (
                    <option value="rejected">Rejected</option>
                  )}
                </select>
              </div>
              {(status === 'received' || status === 'refunded') && !target?.restocked && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={restockEligible}
                    onChange={(e) => setRestockEligible(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  Item passed QA — restock returned quantity back into sellable inventory
                </label>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold">Inspection Notes</label>
                <textarea
                  rows={3}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
