import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  XCircle,
} from 'lucide-react';
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
import { Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { OrderRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

type StatusTab = 'pending' | 'approved' | 'rejected' | 'all';

interface RequestCounts {
  pending: number;
  approved: number;
  rejected: number;
  all: number;
}

export function CancellationRequestsPage() {
  useSeoMeta({ title: 'Order Cancellation Requests | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [requests, setRequests] = useState<OrderRecord[]>([]);
  const [counts, setCounts] = useState<RequestCounts>({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [statusTab, setStatusTab] = useState<StatusTab>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<{
    order: OrderRecord;
    action: 'approve' | 'reject';
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (statusTab !== 'all') qs.set('status', statusTab);
        if (search.trim()) qs.set('q', search.trim());
        qs.set('page', String(page));
        qs.set('limit', '25');

        const res = await apiRequest<{
          ok: true;
          requests: OrderRecord[];
          counts: RequestCounts;
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/api/admin/cancellation-requests?${qs.toString()}`);

        setRequests(res.requests || []);
        if (res.counts) setCounts(res.counts);
        if (res.pagination) setPagination(res.pagination);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Unable to load cancellation requests.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusTab, search, page],
  );

  useEffect(() => {
    loadRequests(false);
  }, [loadRequests]);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setSubmitting(true);
    try {
      await apiRequest(`/api/admin/cancellation-requests/${reviewTarget.order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: reviewTarget.action,
          adminNotes: adminNotes.trim(),
        }),
      });
      dispatch(
        showToast({
          variant: 'success',
          message:
            reviewTarget.action === 'approve'
              ? `Order ${reviewTarget.order.orderNumber} cancellation approved and stock released.`
              : `Cancellation request for ${reviewTarget.order.orderNumber} rejected.`,
        }),
      );
      setReviewTarget(null);
      setAdminNotes('');
      await loadRequests(false);
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to process cancellation request.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="orders.view">
        <div className="mx-auto max-w-[1440px] space-y-4">
          <AdminPageHeader
            title="Cancellation Requests"
            subtitle="Review customer cancellation requests on confirmed, processing, or packed orders. Approving restores reserved stock and flags paid orders for refund."
            breadcrumbs={[
              { label: 'Sales & Orders' },
              { label: 'Orders', to: '/admin/orders' },
              { label: 'Cancellation Requests' },
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadRequests(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#145CFF] ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Syncing...' : 'Refresh Queue'}</span>
                </button>
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
                >
                  All Orders
                </Link>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                key: 'pending' as const,
                label: 'Pending Review',
                value: counts.pending,
                icon: Clock,
                tone: 'bg-amber-50 text-amber-600',
              },
              {
                key: 'approved' as const,
                label: 'Approved',
                value: counts.approved,
                icon: CheckCircle2,
                tone: 'bg-emerald-50 text-emerald-600',
              },
              {
                key: 'rejected' as const,
                label: 'Rejected',
                value: counts.rejected,
                icon: XCircle,
                tone: 'bg-rose-50 text-rose-600',
              },
              {
                key: 'all' as const,
                label: 'Total Requests',
                value: counts.all,
                icon: AlertTriangle,
                tone: 'bg-blue-50 text-[#145CFF]',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    setStatusTab(card.key);
                    setPage(1);
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    statusTab === card.key
                      ? 'border-[#145CFF] bg-[#F4F7FF] dark:bg-blue-950/30 shadow-xs'
                      : 'border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] hover:border-[#BFD3FA]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#64748B]">{card.label}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-1.5 font-display text-lg font-bold text-[#101B35] dark:text-white font-mono-tabular">
                    {card.value.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>

          <SearchFilterBar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Search by order #, customer name, email, phone, or reason..."
          />

          {error && <ErrorBanner message={error} onRetry={() => loadRequests(false)} />}

          <DataTable<OrderRecord>
            rows={requests}
            rowKey={(o) => o.id}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyState={
              <EmptyStateCard
                icon={<AlertTriangle className="h-6 w-6" />}
                title={`No ${statusTab === 'all' ? '' : statusTab} cancellation requests`}
                description="Customer cancellation requests submitted for confirmed or processing orders appear here for review."
              />
            }
            columns={[
              {
                key: 'order',
                header: 'Order',
                render: (o) => (
                  <div>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="font-mono-tabular font-bold text-[#145CFF] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="text-[11px] text-[#64748B]">
                      {o.cancellationRequest?.requestedAt
                        ? new Date(o.cancellationRequest.requestedAt).toLocaleString()
                        : new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (o) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{o.customerName}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {o.customerPhone} · {o.customerEmail}
                    </div>
                  </div>
                ),
              },
              {
                key: 'reason',
                header: 'Reason & Message',
                render: (o) => (
                  <div className="max-w-sm space-y-0.5">
                    <div className="text-xs font-semibold text-[#101B35] dark:text-white">
                      {o.cancellationRequest?.reason || 'Not specified'}
                    </div>
                    {o.cancellationRequest?.message && (
                      <p className="text-[11px] text-[#64748B] line-clamp-2">{o.cancellationRequest.message}</p>
                    )}
                    {o.cancellationRequest?.adminNotes && (
                      <p className="text-[11px] text-[#145CFF]">Admin note: {o.cancellationRequest.adminNotes}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'total',
                header: 'Amount & Payment',
                render: (o) => (
                  <div>
                    <div className="font-mono-tabular font-bold text-[#101B35] dark:text-white">
                      ৳{o.total.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                      <span className="uppercase font-semibold">{o.paymentMethod}</span>
                      <StatusBadge label={o.paymentStatus.replace(/_/g, ' ')} tone={statusToTone(o.paymentStatus)} />
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Request / Order',
                render: (o) => {
                  const reqStatus = o.cancellationRequest?.status || 'pending';
                  const reqTone =
                    reqStatus === 'approved' ? 'emerald' : reqStatus === 'rejected' ? 'rose' : 'amber';
                  return (
                    <div className="flex flex-col gap-1">
                      <StatusBadge label={`Request: ${reqStatus}`} tone={reqTone} />
                      <StatusBadge label={`Order: ${o.orderStatus.replace(/_/g, ' ')}`} tone={statusToTone(o.orderStatus)} />
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (o) => (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#145CFF]" />
                      <span>Inspect</span>
                    </Link>
                    {o.cancellationRequest?.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminNotes('');
                            setReviewTarget({ order: o, action: 'approve' });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminNotes('');
                            setReviewTarget({ order: o, action: 'reject' });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />

          <Modal
            open={Boolean(reviewTarget)}
            onClose={() => setReviewTarget(null)}
            title={
              reviewTarget?.action === 'approve'
                ? `Approve Cancellation · ${reviewTarget.order.orderNumber}`
                : `Reject Cancellation · ${reviewTarget?.order.orderNumber || ''}`
            }
            description={
              reviewTarget?.action === 'approve'
                ? 'Order will transition to Cancelled, reserved stock will be released, and paid orders will be marked Refund Pending.'
                : 'Order will remain active in fulfillment and the customer will receive your operations response.'
            }
            size="md"
          >
            {reviewTarget && (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-3.5 text-xs space-y-1">
                  <div className="font-semibold text-[#101B35]">
                    Customer Reason: {reviewTarget.order.cancellationRequest?.reason}
                  </div>
                  {reviewTarget.order.cancellationRequest?.message && (
                    <p className="text-slate-600">{reviewTarget.order.cancellationRequest.message}</p>
                  )}
                  <div className="pt-1 text-[11px] text-slate-500">
                    Current Stage: <strong className="capitalize">{reviewTarget.order.orderStatus}</strong> · Total: ৳
                    {reviewTarget.order.total.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101B35]">
                    Operations / Refund Note {reviewTarget.action === 'reject' ? '(Recommended)' : '(Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      reviewTarget.action === 'approve'
                        ? 'e.g., Approved prior to courier dispatch. Refund initiated within 3-5 business days.'
                        : 'e.g., Parcel is already packed and handed over to Steadfast Courier manifest.'
                    }
                    className="w-full rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-3 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewTarget(null)}
                    className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                      reviewTarget.action === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {submitting
                      ? 'Processing...'
                      : reviewTarget.action === 'approve'
                        ? 'Confirm Approval & Cancel Order'
                        : 'Reject Cancellation Request'}
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
