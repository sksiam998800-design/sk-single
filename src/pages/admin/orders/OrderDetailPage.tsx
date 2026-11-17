import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MessageSquarePlus,
  Printer,
  RefreshCw,
  Truck,
  XCircle,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  ErrorBanner,
  LoadingCards,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { OrderRecord, PaymentTransactionRecord } from '../../../types/commerce';
import { ORDER_TRANSITIONS, type OrderStatus } from '../../../lib/orderStateMachine';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoMeta({ title: 'Order Detail & Invoice | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled'>('confirmed');
  const [courierName, setCourierName] = useState('Steadfast Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [reason, setReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [paymentStatusChoice, setPaymentStatusChoice] = useState<
    'unpaid' | 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'partially_refunded' | 'refunded'
  >('paid');
  const [paymentNote, setPaymentNote] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [reconcilingTxId, setReconcilingTxId] = useState<string | null>(null);

  const [cancellationAdminNotes, setCancellationAdminNotes] = useState('');
  const [reviewingCancellation, setReviewingCancellation] = useState<'approve' | 'reject' | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: true;
        order: OrderRecord;
        transactions: PaymentTransactionRecord[];
      }>(`/api/admin/orders/${id}`);
      setOrder(res.order);
      setTransactions(res.transactions || []);
      const validNext = (ORDER_TRANSITIONS[res.order.orderStatus as OrderStatus] || []).filter((s) =>
        ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].includes(s),
      );
      if (validNext.length > 0) {
        setNextStatus(validNext[0] as typeof nextStatus);
      }
      if (res.order.courierName) setCourierName(res.order.courierName);
      if (res.order.trackingNumber) setTrackingNumber(res.order.trackingNumber);
      const pStatus = res.order.paymentStatus;
      setPaymentStatusChoice(
        pStatus === 'paid' || res.order.paymentMethod === 'cod'
          ? pStatus === 'refund_pending' || pStatus === 'refunded'
            ? pStatus
            : 'paid'
          : pStatus === 'unpaid' || pStatus === 'pending' || pStatus === 'failed' || pStatus === 'refund_pending' || pStatus === 'refunded'
            ? pStatus
            : 'unpaid',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusTransition = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setUpdatingStatus(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          nextStatus,
          courierName: nextStatus === 'shipped' ? courierName : undefined,
          trackingNumber: nextStatus === 'shipped' ? trackingNumber : undefined,
          reason: reason.trim() || undefined,
        }),
      });
      setOrder(res.order);
      const validNext = (ORDER_TRANSITIONS[res.order.orderStatus as OrderStatus] || []).filter((s) =>
        ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].includes(s),
      );
      if (validNext.length > 0) {
        setNextStatus(validNext[0] as typeof nextStatus);
      }
      setReason('');
      dispatch(showToast({ variant: 'success', message: `Order updated to ${nextStatus}.` }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Status update failed.' }));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || !note.trim()) return;
    setSavingNote(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/admin/orders/${order.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      });
      setOrder(res.order);
      setNote('');
      dispatch(showToast({ variant: 'success', message: 'Staff note added.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Note save failed.' }));
    } finally {
      setSavingNote(false);
    }
  };

  const handlePaymentStatusUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setUpdatingPayment(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/admin/orders/${order.id}/payment-status`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: paymentStatusChoice,
          note: paymentNote.trim() || undefined,
        }),
      });
      setOrder(res.order);
      setPaymentNote('');
      dispatch(showToast({ variant: 'success', message: `Payment status updated to ${paymentStatusChoice}.` }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Payment status update failed.' }));
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleReconcileTransaction = async (txId: string) => {
    setReconcilingTxId(txId);
    try {
      const res = await apiRequest<{ ok: true; outcome: string }>(
        `/api/admin/payments/${encodeURIComponent(txId)}/reconcile`,
        { method: 'POST' },
      );
      dispatch(showToast({ variant: 'info', message: `Gateway reconciled: ${res.outcome}` }));
      await loadOrder();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Reconciliation failed.' }));
    } finally {
      setReconcilingTxId(null);
    }
  };

  const handleCancellationReview = async (action: 'approve' | 'reject') => {
    if (!order) return;
    setReviewingCancellation(action);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/admin/cancellation-requests/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          adminNotes: cancellationAdminNotes.trim(),
        }),
      });
      setOrder(res.order);
      setCancellationAdminNotes('');
      dispatch(
        showToast({
          variant: 'success',
          message:
            action === 'approve'
              ? `Cancellation approved for ${order.orderNumber}. Reserved stock released.`
              : `Cancellation request rejected for ${order.orderNumber}.`,
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to review cancellation request.',
        }),
      );
    } finally {
      setReviewingCancellation(null);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="orders.view">
        <div className="space-y-5 max-w-[1280px] mx-auto">
          <AdminPageHeader
            title={order ? `Order ${order.orderNumber}` : 'Order Detail'}
            subtitle={order ? `Placed ${new Date(order.createdAt).toLocaleString()} by ${order.customerName}` : 'Inspect order items & fulfillment'}
            breadcrumbs={[
              { label: 'Sales & Orders' },
              { label: 'All Orders', to: '/admin/orders' },
              { label: order?.orderNumber || 'Order' },
            ]}
            actions={
              <>
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Link>
                {order && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Invoice
                  </button>
                )}
              </>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadOrder} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : order ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Main Invoice & Line Items */}
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4EAF5] dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-base font-bold text-[#101B35] dark:text-white">{order.orderNumber}</span>
                        <StatusBadge label={order.orderStatus.replace(/_/g, ' ')} tone={statusToTone(order.orderStatus)} />
                        <StatusBadge label={`Payment: ${order.paymentStatus}`} tone={statusToTone(order.paymentStatus)} />
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Method: <span className="uppercase font-semibold">{order.paymentMethod}</span>
                        {' · '}
                        Delivery:{' '}
                        <span className="font-semibold text-[#101B35] dark:text-slate-200">
                          {order.deliveryMethodName || (order.deliveryMethod === 'express' ? 'Priority Express' : 'Standard Delivery')}
                        </span>
                        {order.deliveryEta ? ` (${order.deliveryEta})` : ''}
                        {order.courierName ? ` · Courier: ${order.courierName}` : ''}
                        {order.trackingNumber ? ` · Tracking: ${order.trackingNumber}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-[#101B35] dark:text-white">{order.shippingAddress.recipientName}</div>
                      <div className="text-[#64748B]">
                        {order.shippingAddress.house}
                        {order.shippingAddress.road ? `, ${order.shippingAddress.road}` : ''}, {order.shippingAddress.area},{' '}
                        {order.shippingAddress.upazila}, {order.shippingAddress.district}, {order.shippingAddress.division}
                      </div>
                      <div className="font-mono-tabular text-[#64748B]">
                        {order.shippingAddress.phone}
                        {(order.shippingAddress.email || order.customerEmail)
                          ? ` · ${order.shippingAddress.email || order.customerEmail}`
                          : ''}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                        <tr>
                          <th className="py-2 pr-3">Item & SKU</th>
                          <th className="py-2 pr-3 text-center">Qty</th>
                          <th className="py-2 pr-3 text-right">Unit Price</th>
                          <th className="py-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {order.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-3 pr-3">
                              <div className="font-semibold text-[#101B35] dark:text-white">{item.name}</div>
                              <div className="font-mono-tabular text-[11px] text-[#64748B]">
                                {item.sku}
                                {item.variantOptions && Object.keys(item.variantOptions).length > 0
                                  ? ` · ${Object.values(item.variantOptions).join(' / ')}`
                                  : ''}
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-center font-mono-tabular">{item.quantity}</td>
                            <td className="py-3 pr-3 text-right font-mono-tabular">
                              ৳{item.unitPrice.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 text-right font-mono-tabular font-bold">
                              ৳{item.lineTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-[#E4EAF5] dark:border-slate-800 pt-3 flex flex-col items-end gap-1 text-xs">
                    <div className="flex w-56 justify-between text-[#64748B]">
                      <span>Subtotal</span>
                      <span className="font-mono-tabular">৳{order.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex w-56 justify-between text-emerald-600">
                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                        <span className="font-mono-tabular">-৳{order.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex w-56 justify-between text-[#64748B]">
                      <span>Shipping Charge</span>
                      <span className="font-mono-tabular">৳{order.shippingCharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex w-56 justify-between border-t border-[#E4EAF5] dark:border-slate-800 pt-1.5 text-sm font-bold text-[#101B35] dark:text-white">
                      <span>Grand Total</span>
                      <span className="font-mono-tabular text-[#145CFF]">৳{order.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Transactions & Status Timeline */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                    <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Status Timeline</h3>
                    <div className="space-y-2.5 text-xs">
                      {(order.statusHistory || []).map((h, i) => (
                        <div key={i} className="border-l-2 border-[#145CFF] pl-3">
                          <div className="font-semibold capitalize text-[#101B35] dark:text-white">
                            {h.fromStatus || 'created'} → {h.toStatus}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {h.actorName} · {new Date(h.timestamp).toLocaleString()}
                          </div>
                          {h.reason && <div className="text-[11px] text-[#64748B] italic">{h.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Gateway Transactions</h3>
                      <Link to="/admin/payments" className="text-[11px] font-semibold text-[#145CFF] hover:underline">
                        Payments Console →
                      </Link>
                    </div>
                    {transactions.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No gateway transactions recorded (e.g., Cash on Delivery).</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {transactions.map((t) => {
                          const providerName = (t.provider || t.gateway || 'unknown').toUpperCase();
                          const canReconcile =
                            (t.provider || t.gateway) !== 'cod' &&
                            ['initiated', 'pending', 'authorized', 'expired', 'failed'].includes(t.status);
                          return (
                            <div key={t.id} className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-2.5 space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="uppercase">{providerName}</span>
                                <StatusBadge label={t.status.replace(/_/g, ' ')} tone={statusToTone(t.status)} />
                              </div>
                              <div className="font-mono-tabular text-[11px] text-[#64748B]">
                                Ref: {t.transactionId} · ৳{t.amount.toLocaleString('en-IN')}
                              </div>
                              {(t.gatewayTransactionId || t.bankTransactionId) && (
                                <div className="font-mono-tabular text-[11px] text-[#64748B]">
                                  GW Ref: {t.gatewayTransactionId || t.bankTransactionId}
                                </div>
                              )}
                              {(t.refundedAmount ?? 0) > 0 && (
                                <div className="font-mono-tabular text-[11px] text-rose-600">
                                  Refunded: ৳{(t.refundedAmount ?? 0).toLocaleString('en-IN')}
                                </div>
                              )}
                              {canReconcile && (
                                <button
                                  type="button"
                                  disabled={reconcilingTxId === t.id}
                                  onClick={() => handleReconcileTransaction(t.id)}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#145CFF] hover:bg-blue-100 disabled:opacity-50"
                                >
                                  <RefreshCw className={`h-3 w-3 ${reconcilingTxId === t.id ? 'animate-spin' : ''}`} />
                                  Reconcile Status
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Cancellation Request Review, Fulfillment & Staff Notes */}
              <div className="space-y-5">
                {order.cancellationRequest && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" /> Cancellation Request
                      </h3>
                      <StatusBadge
                        label={order.cancellationRequest.status}
                        tone={
                          order.cancellationRequest.status === 'approved'
                            ? 'emerald'
                            : order.cancellationRequest.status === 'rejected'
                              ? 'rose'
                              : 'amber'
                        }
                      />
                    </div>

                    <div className="rounded-xl bg-white/90 dark:bg-slate-900/70 border border-amber-100 dark:border-slate-800 p-3 text-xs space-y-1">
                      <div className="font-semibold text-[#101B35] dark:text-white">
                        Reason: {order.cancellationRequest.reason}
                      </div>
                      {order.cancellationRequest.message && (
                        <p className="text-[#475569] dark:text-slate-300">{order.cancellationRequest.message}</p>
                      )}
                      <div className="text-[11px] text-[#64748B]">
                        Requested {new Date(order.cancellationRequest.requestedAt).toLocaleString()}
                      </div>
                      {order.cancellationRequest.adminNotes && (
                        <div className="pt-1 text-[11px] font-medium text-[#145CFF]">
                          Review Note: {order.cancellationRequest.adminNotes}
                        </div>
                      )}
                    </div>

                    {order.cancellationRequest.status === 'pending' && (
                      <div className="space-y-2.5">
                        <textarea
                          rows={2}
                          value={cancellationAdminNotes}
                          onChange={(e) => setCancellationAdminNotes(e.target.value)}
                          placeholder="Optional operations or refund timeline note..."
                          className="w-full rounded-xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={reviewingCancellation !== null}
                            onClick={() => handleCancellationReview('approve')}
                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{reviewingCancellation === 'approve' ? 'Approving...' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={reviewingCancellation !== null}
                            onClick={() => handleCancellationReview('reject')}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-300 bg-white py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>{reviewingCancellation === 'reject' ? 'Rejecting...' : 'Reject'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {Array.isArray(order.cancellationHistory) && order.cancellationHistory.length > 0 && (
                      <div className="border-t border-amber-200/70 pt-2.5 space-y-1.5 text-[11px]">
                        <div className="font-semibold text-[#101B35] dark:text-slate-200">Cancellation Audit Trail</div>
                        {order.cancellationHistory.map((ev, idx) => {
                          const evtLabel = ev.action || ev.event || 'updated';
                          return (
                            <div key={idx} className="text-[#475569] dark:text-slate-300">
                              <span className="font-semibold capitalize">{evtLabel.replace(/_/g, ' ')}</span> · {ev.actorName} (
                              {new Date(ev.timestamp).toLocaleString()})
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <form
                  onSubmit={handleStatusTransition}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3"
                >
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#145CFF]" /> Fulfillment Control
                  </h3>
                  {(() => {
                    const allowedNext = (ORDER_TRANSITIONS[order.orderStatus as OrderStatus] || []).filter((s) =>
                      ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].includes(s),
                    );
                    if (allowedNext.length === 0) {
                      return (
                        <p className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900 px-3 py-2.5 text-xs text-[#64748B]">
                          Order is currently <strong className="capitalize">{order.orderStatus.replace(/_/g, ' ')}</strong>. No further fulfillment transitions apply.
                        </p>
                      );
                    }
                    return (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold">Transition To</label>
                          <select
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value as typeof nextStatus)}
                            className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                          >
                            {allowedNext.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        {nextStatus === 'shipped' && (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-semibold">Courier Partner</label>
                              <select
                                value={courierName}
                                onChange={(e) => setCourierName(e.target.value)}
                                className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                              >
                                <option value="Steadfast Courier">Steadfast Courier</option>
                                <option value="RedX Logistics">RedX Logistics</option>
                                <option value="Pathao Courier">Pathao Courier</option>
                                <option value="SA Paribahan">SA Paribahan</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold">Tracking Number *</label>
                              <input
                                required
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="TRK-..."
                                className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-semibold">Reason / Dispatch Note</label>
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={updatingStatus}
                          className="w-full rounded-xl bg-[#145CFF] py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                        >
                          {updatingStatus ? 'Updating...' : 'Update Order Status'}
                        </button>
                      </>
                    );
                  })()}
                </form>

                <form
                  onSubmit={handlePaymentStatusUpdate}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3"
                >
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#145CFF]" /> Payment Verification
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    {order.paymentMethod === 'cod'
                      ? 'Confirm cash collection upon delivery for Cash on Delivery orders.'
                      : order.paymentMethod === 'nagad'
                        ? 'Digital orders verify automatically via gateway. For Nagad portal refunds, record the portal reference below.'
                        : 'Digital gateway orders require server verification and gateway API refunds via Payments Console.'}
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Payment Status</label>
                    <select
                      value={paymentStatusChoice}
                      onChange={(e) => setPaymentStatusChoice(e.target.value as typeof paymentStatusChoice)}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="initiated">Initiated</option>
                      <option value="pending">Pending</option>
                      <option value="paid" disabled={order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid'}>
                        Paid
                      </option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refund_pending">Refund Pending</option>
                      <option
                        value="partially_refunded"
                        disabled={!['cod', 'nagad'].includes(order.paymentMethod) && order.paymentStatus !== 'partially_refunded'}
                      >
                        Partially Refunded
                      </option>
                      <option
                        value="refunded"
                        disabled={!['cod', 'nagad'].includes(order.paymentMethod) && order.paymentStatus !== 'refunded'}
                      >
                        Refunded
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Payment Note (Optional)</label>
                    <input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. Cash collected by rider"
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingPayment}
                    className="w-full rounded-xl border border-[#145CFF] text-[#145CFF] hover:bg-[#EAF1FF] py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {updatingPayment ? 'Saving...' : 'Update Payment Status'}
                  </button>
                </form>

                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-[#145CFF]" /> Internal Staff Notes
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {(order.staffNotes || []).length === 0 ? (
                      <p className="text-[#64748B]">No internal notes yet.</p>
                    ) : (
                      (order.staffNotes || []).map((n, i) => (
                        <div key={i} className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900 p-2.5">
                          <div className="text-[#101B35] dark:text-slate-200">{n.note}</div>
                          <div className="mt-1 text-[10.5px] text-[#64748B]">
                            {n.actorName} · {new Date(n.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add internal coordination note..."
                      className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={savingNote || !note.trim()}
                      className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
