import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, HelpCircle, Plus, Trash2 } from 'lucide-react';
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
import type { FaqItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function FaqManagementPage() {
  useSeoMeta({ title: 'FAQ Management | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; faqs: FaqItem[] }>('/api/admin/cms/faqs');
      setFaqs(res.faqs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setCategory('General');
    setSortOrder('0');
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEdit = (f: FaqItem) => {
    setEditingId(f.id);
    setQuestion(f.question);
    setAnswer(f.answer);
    setCategory(f.category || 'General');
    setSortOrder(String(f.sortOrder ?? 0));
    setIsPublished(Boolean(f.isPublished));
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || 'General',
        sortOrder: Number(sortOrder || 0),
        isPublished,
      };
      if (editingId) {
        await apiRequest(`/api/admin/cms/faqs/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'FAQ updated.' }));
      } else {
        await apiRequest('/api/admin/cms/faqs', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'FAQ added.' }));
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
      await apiRequest(`/api/admin/cms/faqs/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'FAQ removed.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="FAQ Management"
            subtitle="Curate customer help questions, shipping answers, and warranty explanations displayed on /faqs."
            breadcrumbs={[{ label: 'Content Management' }, { label: 'FAQ Management' }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add FAQ
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<FaqItem>
            rows={faqs}
            rowKey={(f) => f.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<HelpCircle className="h-6 w-6" />}
                title="No FAQs published"
                description="Add commonly asked shipping, warranty, and payment questions."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Add FAQ
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'question',
                header: 'Question & Answer',
                render: (f) => (
                  <div className="max-w-xl">
                    <div className="font-semibold text-[#101B35] dark:text-white">{f.question}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B] line-clamp-2">{f.answer}</div>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: (f) => <StatusBadge label={f.category} tone="blue" />,
              },
              {
                key: 'order',
                header: 'Order',
                align: 'center',
                render: (f) => <span className="font-mono-tabular font-semibold">{f.sortOrder}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (f) => (
                  <StatusBadge label={f.isPublished ? 'Published' : 'Draft'} tone={f.isPublished ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (f) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(f)}
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
            title={editingId ? 'Edit FAQ' : 'Add FAQ'}
            size="md"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Question *</label>
                <input
                  required
                  minLength={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Answer *</label>
                <textarea
                  required
                  minLength={4}
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Published on storefront /faqs
              </label>
              <div className="flex justify-end gap-2">
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
                  {saving ? 'Saving...' : 'Save FAQ'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete FAQ"
            message={`Remove "${deleteTarget?.question}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
