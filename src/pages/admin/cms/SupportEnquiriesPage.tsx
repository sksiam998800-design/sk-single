import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Headphones, MessageCircle } from 'lucide-react';
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
import type { SupportEnquiryRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function SupportEnquiriesPage() {
  useSeoMeta({ title: 'Support Enquiries | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [enquiries, setEnquiries] = useState<SupportEnquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<SupportEnquiryRecord | null>(null);
  const [status, setStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('in_progress');
  const [internalNote, setInternalNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; enquiries: SupportEnquiryRecord[] }>('/api/admin/support');
      setEnquiries(res.enquiries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load support enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/support/${target.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, internalNote: internalNote.trim() || undefined }),
      });
      dispatch(showToast({ variant: 'success', message: 'Support ticket updated.' }));
      setTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="support.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Support Enquiries"
            subtitle="Respond to customer contact tickets, order help requests, and internal resolution logs."
            breadcrumbs={[{ label: 'Customer' }, { label: 'Support Enquiries' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<SupportEnquiryRecord>
            rows={enquiries}
            rowKey={(e) => e.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Headphones className="h-6 w-6" />}
                title="No support tickets open"
                description="Customer messages sent via /contact will appear here for staff triage."
              />
            }
            columns={[
              {
                key: 'customer',
                header: 'Customer',
                render: (e) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{e.name}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {e.email}
                      {e.phone ? ` · ${e.phone}` : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'subject',
                header: 'Subject & Message',
                render: (e) => (
                  <div className="max-w-md">
                    <div className="font-semibold text-[#101B35] dark:text-white">{e.subject}</div>
                    <div className="text-[11px] text-[#64748B] line-clamp-2">{e.message}</div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Ticket Status',
                render: (e) => <StatusBadge label={e.status.replace(/_/g, ' ')} tone={statusToTone(e.status)} />,
              },
              {
                key: 'date',
                header: 'Received',
                render: (e) => <span className="text-xs text-[#64748B]">{new Date(e.createdAt).toLocaleDateString()}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (e) => (
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(e);
                      setStatus(e.status);
                      setInternalNote('');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Triage
                  </button>
                ),
              },
            ]}
          />

          <Modal
            open={Boolean(target)}
            onClose={() => setTarget(null)}
            title={`Ticket · ${target?.subject || ''}`}
            size="md"
          >
            {target && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs space-y-1">
                  <div className="font-semibold text-[#101B35] dark:text-white">
                    From: {target.name} ({target.email})
                  </div>
                  <p className="text-[#64748B] dark:text-slate-300 leading-relaxed">{target.message}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Ticket Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {target.internalNotes && target.internalNotes.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-3 text-xs">
                    <div className="font-semibold text-[#101B35] dark:text-white">Previous Staff Notes</div>
                    {target.internalNotes.map((item, idx) => (
                      <div key={idx} className="text-[#64748B] dark:text-slate-300">
                        <span className="font-semibold text-[#101B35] dark:text-white">{item.actorName}:</span> {item.note}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold">Add Internal Staff Note</label>
                  <textarea
                    rows={3}
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Resolution summary or follow-up action..."
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
                    {saving ? 'Updating...' : 'Save Ticket'}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
