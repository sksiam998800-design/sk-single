import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Eye,
  RefreshCw,
  RotateCcw,
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
import { canRefundPaymentTransaction, computeRefundableBalance } from '../../../lib/orderStateMachine';
import type { OrderRecord, PaymentTransactionRecord } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface PaymentSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  paidVolume: number;
  refundedVolume: number;
  codPendingCount: number;
  codPendingVolume: number;
}

interface PaymentAnalyticsData {
  days: number;
  byProvider: Array<{
    provider: string;
    totalCount: number;
    paidCount: number;
    failedCount: number;
    pendingCount: number;
    paidVolume: number;
    refundedVolume: number;
    successRate: number;
  }>;
  byMethod: Array<{
    paymentMethod: string;
    ordersCount: number;
    grossVolume: number;
    paidVolume: number;
  }>;
  codBreakdown: Array<{ status: string; count: number; volume: number }>;
}

export function PaymentTransactionsPage() {
  useSeoMeta({ title: 'Payment Transactions | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [analytics, setAnalytics] = useState<PaymentAnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchReconciling, setBatchReconciling] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTx, setDetailTx] = useState<PaymentTransactionRecord | null>(null);
  const [detailOrder, setDetailOrder] = useState<Partial<OrderRecord> | null>(null);

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<PaymentTransactionRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (statusFilter) qs.set('status', statusFilter);
      if (providerFilter) qs.set('provider', providerFilter);
      if (dateFrom) qs.set('dateFrom', dateFrom);
      if (dateTo) qs.set('dateTo', dateTo);

      const [txRes, analyticsRes] = await Promise.all([
        apiRequest<{
          ok: true;
          transactions: PaymentTransactionRecord[];
          summary?: PaymentSummary;
        }>(`/api/admin/payments?${qs.toString()}`),
        apiRequest<{ ok: true; analytics: PaymentAnalyticsData }>(
          `/api/admin/payments/analytics?days=${analyticsDays}`,
        ).catch(() => null),
      ]);

      setTransactions(txRes.transactions || []);
      if (txRes.summary) setSummary(txRes.summary);
      if (analyticsRes?.analytics) setAnalytics(analyticsRes.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load payment transactions.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, providerFilter, dateFrom, dateTo, analyticsDays]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBatchReconcile = async () => {
    setBatchReconciling(true);
    try {
      const res = await apiRequest<{ ok: true; count: number }>('/api/admin/payments/reconcile-pending', {
        method: 'POST',
        body: JSON.stringify({ limit: 25 }),
      });
      dispatch(
        showToast({
          variant: 'success',
          message: `Reconciled ${res.count} pending online payment session(s).`,
        }),
      );
      await load();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Batch reconciliation failed.',
        }),
      );
    } finally {
      setBatchReconciling(false);
    }
  };

  const handleReconcileSingle = async (tx: PaymentTransactionRecord) => {
    setRowBusyId(tx.id);
    try {
      const res = await apiRequest<{ ok: true; outcome: string }>(
        `/api/admin/payments/${encodeURIComponent(tx.id)}/reconcile`,
        { method: 'POST' },
      );
      dispatch(
        showToast({
          variant: 'info',
          message: `Transaction ${tx.transactionId} reconciled (${res.outcome}).`,
        }),
      );
      await load();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Reconciliation failed.',
        }),
      );
    } finally {
      setRowBusyId(null);
    }
  };

  const handleOpenDetail = async (tx: PaymentTransactionRecord) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailTx(tx);
    setDetailOrder(null);
    try {
      const res = await apiRequest<{
        ok: true;
        transaction: PaymentTransactionRecord;
        order: Partial<OrderRecord> | null;
      }>(`/api/admin/payments/${encodeURIComponent(tx.id)}`);
      setDetailTx(res.transaction);
      setDetailOrder(res.order);
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to load transaction detail.',
        }),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openRefundModal = (tx: PaymentTransactionRecord) => {
    const balance = computeRefundableBalance(tx.amount, tx.refundedAmount || 0);
    setRefundTarget(tx);
    setRefundAmount(String(balance));
    setRefundReason('');
  };

  const handleSubmitRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const amountVal = Number(refundAmount);
      const res = await apiRequest<{
        ok: true;
        refundId: string;
        refundedAmount: number;
      }>(`/api/admin/payments/${encodeURIComponent(refundTarget.id)}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number.isFinite(amountVal) && amountVal > 0 ? amountVal : undefined,
          reason: refundReason.trim(),
        }),
      });
      dispatch(
        showToast({
          variant: 'success',
          message: `Refund ${res.refundId} (৳${res.refundedAmount.toLocaleString('en-IN')}) completed.`,
        }),
      );
      setRefundTarget(null);
      await load();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Gateway refund failed.',
        }),
      );
    } finally {
      setRefunding(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="payments.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Payment Transactions & Reconciliation"
            subtitle="Inspect bKash, Nagad, SSLCommerz/Card, and COD settlements, verify pending callbacks, and issue refunds."
            breadcrumbs={[{ label: 'Sales & Orders' }, { label: 'Payment Transactions' }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchReconcile}
                  disabled={batchReconciling}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${batchReconciling ? 'animate-spin' : ''}`} />
                  {batchReconciling ? 'Reconciling...' : 'Reconcile Pending'}
                </button>
                <Link
                  to="/admin/payments/methods"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
                >
                  Configure Gateways
                </Link>
              </div>
            }
          />

          {/* Summary KPI Strip */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Settled Volume', value: `৳${Number(summary.paidVolume ?? 0).toLocaleString('en-IN')}`, tone: 'text-emerald-600' },
                { label: 'Paid Transactions', value: String(summary.paidCount ?? 0), tone: 'text-[#145CFF]' },
                { label: 'Pending / Initiated', value: String(summary.pendingCount ?? 0), tone: 'text-amber-600' },
                { label: 'Failed / Cancelled', value: String(summary.failedCount ?? 0), tone: 'text-rose-600' },
                { label: 'Refunded Volume', value: `৳${Number(summary.refundedVolume ?? 0).toLocaleString('en-IN')}`, tone: 'text-slate-700 dark:text-slate-200' },
                { label: 'COD Pending Cash', value: `৳${Number(summary.codPendingVolume ?? 0).toLocaleString('en-IN')}`, tone: 'text-blue-600' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs"
                >
                  <div className="text-[11px] font-semibold text-[#64748B]">{kpi.label}</div>
                  <div className={`mt-1 font-mono-tabular text-lg font-extrabold ${kpi.tone}`}>{kpi.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Gateway Breakdown & Period Selector */}
          {analytics && analytics.byProvider.length > 0 && (
            <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xs font-bold uppercase tracking-wide text-[#64748B] flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[#145CFF]" /> Provider Performance ({analytics.days}d)
                </h2>
                <div className="flex items-center gap-1">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAnalyticsDays(d)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        analyticsDays === d
                          ? 'bg-[#145CFF] text-white'
                          : 'bg-[#F4F7FF] dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {analytics.byProvider.map((p) => (
                  <div
                    key={p.provider}
                    className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="uppercase">{p.provider}</span>
                      <span className="font-mono-tabular text-emerald-600">{p.successRate}% success</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>{p.paidCount}/{p.totalCount} paid</span>
                      <span className="font-mono-tabular font-semibold text-[#101B35] dark:text-white">
                        ৳{Number(p.paidVolume ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <SearchFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search order #, internal ref, bKash trxID, bank ref, or customer..."
              filters={
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    aria-label="Filter by provider"
                    className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium"
                  >
                    <option value="">All Gateways</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="sslcommerz">SSLCommerz / Card</option>
                    <option value="cod">COD</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="initiated">Initiated</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="refund_pending">Refund Pending</option>
                    <option value="partially_refunded">Partially Refunded</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label="From date"
                    className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    aria-label="To date"
                    className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  />
                </div>
              }
            />
          </div>

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<PaymentTransactionRecord>
            rows={transactions}
            rowKey={(t) => t.id || t.transactionId}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<CreditCard className="h-6 w-6" />}
                title="No matching payment transactions"
                description="Completed, pending, and failed gateway charges across bKash, Nagad, SSLCommerz, and Cards will appear here."
              />
            }
            columns={[
              {
                key: 'ref',
                header: 'Transaction & Gateway Ref',
                render: (t) => (
                  <div>
                    <div className="font-mono-tabular font-bold text-[#101B35] dark:text-white">{t.transactionId}</div>
                    {(t.gatewayTransactionId || t.gatewayPaymentId || t.bankTransactionId) && (
                      <div className="font-mono-tabular text-[11px] text-[#64748B]">
                        GW: {t.gatewayTransactionId || t.gatewayPaymentId || t.bankTransactionId}
                      </div>
                    )}
                    <div className="text-[11px] text-[#64748B]">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                ),
              },
              {
                key: 'order',
                header: 'Order & Customer',
                render: (t) => (
                  <div>
                    <Link to={`/admin/orders/${t.orderId}`} className="font-semibold text-[#145CFF] hover:underline">
                      {t.orderNumber ? `${t.orderNumber} →` : 'View Order →'}
                    </Link>
                    {(t.customerName || t.customerEmail) && (
                      <div className="text-[11px] text-[#64748B]">
                        {t.customerName || ''} {t.customerEmail ? `(${t.customerEmail})` : ''}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'gateway',
                header: 'Provider',
                render: (t) => {
                  const gw = (t.provider || t.gateway || 'unknown').toUpperCase();
                  return (
                    <div>
                      <StatusBadge label={gw} tone="blue" />
                      {t.paymentMethod && t.paymentMethod !== t.provider && (
                        <div className="mt-0.5 text-[10px] uppercase text-[#64748B]">{t.paymentMethod}</div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'amount',
                header: 'Amount',
                render: (t) => (
                  <div>
                    <div className="font-mono-tabular font-bold">৳{Number(t.amount ?? 0).toLocaleString('en-IN')}</div>
                    {(t.refundedAmount ?? 0) > 0 && (
                      <div className="font-mono-tabular text-[11px] text-rose-600">
                        Refunded: ৳{Number(t.refundedAmount ?? 0).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (t) => (
                  <div>
                    <StatusBadge label={t.status.replace(/_/g, ' ')} tone={statusToTone(t.status)} />
                    {t.failureReason && (
                      <div className="mt-1 max-w-[180px] truncate text-[10.5px] text-rose-600" title={t.failureReason}>
                        {t.failureReason}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (t) => {
                  const canReconcile =
                    (t.provider || t.gateway) !== 'cod' &&
                    ['initiated', 'pending', 'authorized', 'expired', 'failed'].includes(t.status);
                  const canRefund = canRefundPaymentTransaction({
                    status: t.status,
                    amount: t.amount,
                    refundedAmount: t.refundedAmount,
                  });

                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(t)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-3 w-3" /> Inspect
                      </button>
                      {canReconcile && (
                        <button
                          type="button"
                          disabled={rowBusyId === t.id}
                          onClick={() => handleReconcileSingle(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#145CFF] hover:bg-blue-100 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${rowBusyId === t.id ? 'animate-spin' : ''}`} /> Reconcile
                        </button>
                      )}
                      {canRefund && (
                        <button
                          type="button"
                          onClick={() => openRefundModal(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <RotateCcw className="h-3 w-3" /> Refund
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </div>

        {/* Transaction Detail Modal */}
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={detailTx ? `Transaction ${detailTx.transactionId}` : 'Transaction Details'}
          size="lg"
        >
          {detailLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading transaction audit log...</div>
          ) : detailTx ? (
            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3.5">
                <div>
                  <span className="text-[#64748B]">Provider / Method:</span>{' '}
                  <strong className="uppercase">{detailTx.provider || detailTx.gateway}</strong> ({detailTx.paymentMethod || 'n/a'})
                </div>
                <div>
                  <span className="text-[#64748B]">Status:</span>{' '}
                  <StatusBadge label={detailTx.status} tone={statusToTone(detailTx.status)} />
                </div>
                <div>
                  <span className="text-[#64748B]">Requested / Verified:</span>{' '}
                  <strong className="font-mono-tabular">
                    ৳{Number(detailTx.requestedAmount || detailTx.amount || 0).toLocaleString('en-IN')} / ৳
                    {Number(detailTx.verifiedAmount ?? 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Refunded:</span>{' '}
                  <strong className="font-mono-tabular text-rose-600">
                    ৳{Number(detailTx.refundedAmount ?? 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                {detailTx.gatewayPaymentId && (
                  <div className="font-mono-tabular break-all">
                    <span className="text-[#64748B]">Gateway Payment ID:</span> {detailTx.gatewayPaymentId}
                  </div>
                )}
                {detailTx.gatewayTransactionId && (
                  <div className="font-mono-tabular break-all">
                    <span className="text-[#64748B]">Gateway Trx ID:</span> {detailTx.gatewayTransactionId}
                  </div>
                )}
                {detailTx.gatewayValidationId && (
                  <div className="font-mono-tabular break-all">
                    <span className="text-[#64748B]">Validation ID:</span> {detailTx.gatewayValidationId}
                  </div>
                )}
                {detailTx.bankTransactionId && (
                  <div className="font-mono-tabular break-all">
                    <span className="text-[#64748B]">Bank Ref:</span> {detailTx.bankTransactionId}
                  </div>
                )}
              </div>

              {detailTx.failureReason && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{detailTx.failureReason}</span>
                </div>
              )}

              {detailOrder && (
                <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-3">
                  <div className="font-bold text-[#0F1D3A] dark:text-white mb-1">
                    Linked Order #{detailOrder.orderNumber}
                  </div>
                  <div className="text-[#64748B]">
                    Order Status: <strong className="uppercase">{detailOrder.orderStatus}</strong> · Payment:{' '}
                    <strong className="uppercase">{detailOrder.paymentStatus}</strong>
                  </div>
                </div>
              )}

              {Array.isArray(detailTx.refunds) && detailTx.refunds.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[#0F1D3A] dark:text-white">Refund History</div>
                  {detailTx.refunds.map((r) => (
                    <div
                      key={r.refundId}
                      className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-2.5"
                    >
                      <div>
                        <div className="font-mono-tabular font-semibold">
                          {r.refundId} {r.gatewayRefundId ? `(${r.gatewayRefundId})` : ''}
                        </div>
                        <div className="text-[#64748B]">
                          {r.reason} · {r.requestedByName || 'Staff'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-tabular font-bold text-rose-600">
                          -৳{Number(r.amount ?? 0).toLocaleString('en-IN')}
                        </div>
                        <StatusBadge label={r.status} tone={r.status === 'completed' ? 'emerald' : 'rose'} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(detailTx.webhookEvents) && detailTx.webhookEvents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[#0F1D3A] dark:text-white">Gateway Callback &amp; Webhook Events</div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {detailTx.webhookEvents.map((ev) => (
                      <div
                        key={ev.eventId}
                        className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${ev.verified ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span className="uppercase font-semibold">{ev.source}</span>
                          <span>→ {ev.status}</span>
                          {ev.error && <span className="text-rose-600">({ev.error})</span>}
                        </div>
                        <span className="text-[#64748B]">{new Date(ev.receivedAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>

        {/* Refund Modal */}
        <Modal
          open={Boolean(refundTarget)}
          onClose={() => setRefundTarget(null)}
          title={refundTarget ? `Issue Refund — ${refundTarget.transactionId}` : 'Issue Refund'}
          size="sm"
        >
          {refundTarget && (
            <form onSubmit={handleSubmitRefund} className="space-y-4 text-xs">
              <div className="rounded-xl bg-[#F8FAFF] border border-[#E4EAF5] p-3 space-y-1">
                <div>
                  Provider: <strong className="uppercase">{refundTarget.provider || refundTarget.gateway}</strong>
                </div>
                <div>
                  Remaining Refundable Balance:{' '}
                  <strong className="font-mono-tabular text-[#145CFF]">
                    ৳{computeRefundableBalance(refundTarget.amount, refundTarget.refundedAmount || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Refund Amount (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={computeRefundableBalance(refundTarget.amount, refundTarget.refundedAmount || 0)}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 font-mono-tabular text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Refund Reason *</label>
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Approved return claim / Customer cancelled before dispatch"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="rounded-lg border px-4 py-2 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {refunding ? 'Processing Refund...' : 'Confirm Gateway Refund'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </PermissionGuard>
    </AdminLayout>
  );
}
