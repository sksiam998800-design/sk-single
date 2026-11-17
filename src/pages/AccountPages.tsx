import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { openAuthModal, setUserProfile } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest } from '../services/api';
import type { OrderRecord, SavedAddress, UserProfile } from '../types/commerce';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { ResilientImage } from '../components/ui/ResilientImage';
import { AccountLayout, type AccountNavKey } from '../components/account/AccountLayout';
import {
  canCustomerRequestReturn,
  canRetryOrderPayment,
  getOrderCancellationEligibility,
} from '../lib/orderStateMachine';
import {
  getAreasForUpazila,
  getDistrictsForDivision,
  getDivisionNames,
  getUpazilasForDistrict,
} from '../lib/bdLocations';
import { useSeoMeta } from '../lib/useSeoMeta';

function AccountAuthGate({ title, activeKey }: { title: string; activeKey: AccountNavKey }) {
  const dispatch = useAppDispatch();
  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey={activeKey}>
        <div className="rounded-2xl border border-[#DCE6F7] bg-white px-6 py-14 text-center shadow-xs">
          <Lock className="mx-auto h-12 w-12 text-[#1155EE]" />
          <h1 className="font-display mt-4 text-2xl font-bold text-[#0F1D3A]">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to view your account, orders, and saved addresses.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => dispatch(openAuthModal({ tab: 'login', returnUrl: window.location.pathname }))}
              className="rounded-full bg-[#1155EE] px-7 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              Sign In
            </button>
            <Link
              to="/register"
              className="rounded-full border border-[#C7DAFF] bg-[#F2F7FF] px-7 py-2.5 text-sm font-semibold text-[#1155EE] hover:bg-[#E5EFFF]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </AccountLayout>
    </div>
  );
}

export function AccountProfilePage() {
  useSeoMeta({ title: 'Account Settings | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone || '');
    setAvatarUrl(user.avatarUrl || '');
    setOrderUpdates(user.notificationPrefs?.orderUpdates ?? true);
    setPromotions(user.notificationPrefs?.promotions ?? false);
  }, [user]);

  if (!user) return <AccountAuthGate title="Account Settings" activeKey="settings" />;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<{ ok: true; user: UserProfile }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone,
          avatarUrl: avatarUrl.trim(),
          notificationPrefs: { orderUpdates, promotions, backInStock: true },
        }),
      });
      dispatch(setUserProfile(res.user));
      dispatch(showToast({ variant: 'success', message: 'Profile and preferences updated.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="settings">
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs space-y-4 max-w-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#1155EE]" />
              <h1 className="font-display text-xl font-extrabold text-[#0F1D3A]">Account Settings</h1>
            </div>
            <Link to="/account/security" className="text-xs font-semibold text-[#1155EE] hover:underline">
              Password &amp; Security →
            </Link>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Profile Avatar URL (Optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={orderUpdates} onChange={(e) => setOrderUpdates(e.target.checked)} />
              Receive order status &amp; delivery email updates
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={promotions} onChange={(e) => setPromotions(e.target.checked)} />
              Receive promotional campaigns &amp; offers
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </AccountLayout>
    </div>
  );
}

export function OrderHistoryPage() {
  useSeoMeta({ title: 'My Orders | NOVARA COMMERCE', noIndex: true });
  const { user } = useAppSelector((s) => s.auth);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiRequest<{ ok: true; orders: OrderRecord[] }>('/api/orders/my')
      .then((res) => setOrders(res.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <AccountAuthGate title="My Order History" activeKey="orders" />;

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="orders">
        <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h1 className="font-display text-xl font-extrabold text-[#0F1D3A]">My Orders</h1>
              <p className="text-xs text-slate-500">
                Track deliveries, cancel pending orders, or submit cancellation requests for processing orders.
              </p>
            </div>
            <Link to="/track-order" className="text-xs font-semibold text-[#1155EE] hover:underline">
              Track Order by ID →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 font-display text-lg font-bold text-[#0F1D3A]">No orders placed yet</p>
              <Link
                to="/shop"
                className="mt-4 inline-block rounded-full bg-[#1155EE] px-6 py-2 text-xs font-semibold text-white"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-[#DCE6F7] bg-white p-4 sm:p-5 hover:border-[#B6CCF7] transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono-tabular text-sm font-bold text-[#0F1D3A]">
                        #{order.orderNumber}
                      </span>
                      <span className="ml-3 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      {order.cancellationRequest?.status === 'pending' && (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-amber-700">
                          Cancellation Requested
                        </span>
                      )}
                      {order.cancellationRequest?.status === 'rejected' && (
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-rose-700">
                          Cancel Request Declined
                        </span>
                      )}
                      <span className="uppercase text-slate-500">Payment: {order.paymentStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span className="rounded-full bg-[#EEF4FF] px-2.5 py-0.5 uppercase text-[#1155EE]">
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((it, idx) => (
                          <div key={idx} className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                            <ResilientImage src={it.imageUrl} alt={it.name} />
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-slate-600">
                        <p className="font-semibold text-[#0F1D3A]">
                          {order.items[0]?.name}
                          {order.items.length > 1 ? ` + ${order.items.length - 1} more item(s)` : ''}
                        </p>
                        <p>
                          Total:{' '}
                          <strong className="font-mono-tabular text-[#1155EE]">
                            ৳{order.total.toLocaleString()}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/account/orders/${order.id}`}
                      className="rounded-xl border border-[#1155EE] px-4 py-2 text-xs font-semibold text-[#1155EE] hover:bg-[#E9F0FD]"
                    >
                      Manage / View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccountLayout>
    </div>
  );
}

const CANCELLATION_REASONS = [
  'Ordered by mistake / changed mind',
  'Need to change delivery address or phone',
  'Want to modify item variant or quantity',
  'Found a better price / coupon offer',
  'Expected delivery timeframe is too long',
  'Other reason',
];

export function OrderDetailPage() {
  useSeoMeta({ title: 'Order Details | NOVARA COMMERCE', noIndex: true });
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Direct cancel modal (pending orders)
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Cancellation request modal (confirmed / processing / packed)
  const [cancelRequestModalOpen, setCancelRequestModalOpen] = useState(false);
  const [reqReason, setReqReason] = useState(CANCELLATION_REASONS[0]);
  const [reqMessage, setReqMessage] = useState('');
  const [submittingCancelReq, setSubmittingCancelReq] = useState(false);

  // Return modal (delivered within 7d)
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDetails, setReturnDetails] = useState('');

  // Retry online payment state
  const [retryMethod, setRetryMethod] = useState<'bkash' | 'nagad' | 'card' | 'sslcommerz'>('bkash');
  const [retryingPayment, setRetryingPayment] = useState(false);

  const loadOrder = () => {
    if (!id || !user) return;
    setLoading(true);
    apiRequest<{ ok: true; order: OrderRecord }>(`/api/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        if (res.order.paymentMethod !== 'cod') {
          setRetryMethod(res.order.paymentMethod);
        }
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [id, user]);

  if (!user) return <AccountAuthGate title="Order Details" activeKey="orders" />;

  if (loading) {
    return (
      <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
        <AccountLayout activeKey="orders">
          <div className="rounded-2xl border border-[#DCE6F7] bg-white p-10 text-sm text-slate-500">
            Loading order details...
          </div>
        </AccountLayout>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
        <AccountLayout activeKey="orders">
          <div className="rounded-2xl border border-[#DCE6F7] bg-white p-10 text-sm text-rose-600">
            Order not found.
          </div>
        </AccountLayout>
      </div>
    );
  }

  const cancelEligibility = getOrderCancellationEligibility({
    orderStatus: order.orderStatus,
    cancellationRequest: order.cancellationRequest,
    deliveredAt: order.deliveredAt,
  });

  const handleCancelOrder = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingCancel(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setOrder(res.order);
      setCancelModalOpen(false);
      setCancelReason('');
      dispatch(showToast({ variant: 'info', message: 'Order cancelled and reserved stock released.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to cancel order' }));
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleSubmitCancellationRequest = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingCancelReq(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord; message: string }>(
        `/api/orders/${order.id}/cancellation-request`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reqReason, message: reqMessage.trim() }),
        },
      );
      setOrder(res.order);
      setCancelRequestModalOpen(false);
      setReqMessage('');
      dispatch(
        showToast({
          variant: 'success',
          message: res.message || 'Cancellation request submitted for admin review.',
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to submit cancellation request',
        }),
      );
    } finally {
      setSubmittingCancelReq(false);
    }
  };

  const handleReturnSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/api/orders/${order.id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason: returnReason, details: returnDetails }),
      });
      setReturnModalOpen(false);
      loadOrder();
      dispatch(showToast({ variant: 'success', message: 'Return request submitted for inspection.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Return request failed' }));
    }
  };

  const handleRetryPayment = async () => {
    if (retryingPayment) return;
    setRetryingPayment(true);
    try {
      const res = await apiRequest<{ ok: true; gatewayUrl?: string | null }>(
        `/api/orders/${order.id}/retry-payment`,
        {
          method: 'POST',
          body: JSON.stringify({ paymentMethod: retryMethod }),
        },
      );
      if (res.gatewayUrl) {
        window.location.href = res.gatewayUrl;
        return;
      }
      loadOrder();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to initiate payment' }));
    } finally {
      setRetryingPayment(false);
    }
  };

  const retryEligible = canRetryOrderPayment({
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  });

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="orders">
        <div className="space-y-5">
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs">
            <div>
              <Link to="/account/orders" className="text-xs font-semibold text-[#1155EE] hover:underline">
                ← Back to My Orders
              </Link>
              <h1 className="font-display mt-1 text-2xl font-extrabold text-[#0F1D3A]">
                Order <span className="font-mono-tabular">#{order.orderNumber}</span>
              </h1>
              <p className="text-xs text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {cancelEligibility.mode === 'direct_cancel' && (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="h-4 w-4" /> Cancel Order
                </button>
              )}

              {cancelEligibility.mode === 'request_cancellation' && (
                <button
                  type="button"
                  onClick={() => setCancelRequestModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <AlertTriangle className="h-4 w-4" /> Request Order Cancellation
                </button>
              )}

              {canCustomerRequestReturn(order.orderStatus, order.deliveredAt) && (
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4" /> Request Return
                </button>
              )}
            </div>
          </div>

          {/* Cancellation Status & Dispatch Guard Notices */}
          {order.cancellationRequest && (
            <div
              className={`rounded-2xl border p-4 text-xs shadow-xs ${
                order.cancellationRequest.status === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : order.cancellationRequest.status === 'approved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Cancellation Request: <span className="uppercase">{order.cancellationRequest.status}</span>
                </span>
                {order.cancellationRequest.requestedAt && (
                  <span className="font-normal opacity-80">
                    Submitted {new Date(order.cancellationRequest.requestedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="mt-1">
                <strong>Reason:</strong> {order.cancellationRequest.reason}
              </p>
              {order.cancellationRequest.message && (
                <p className="mt-0.5">
                  <strong>Note:</strong> {order.cancellationRequest.message}
                </p>
              )}
              {order.cancellationRequest.adminNotes && (
                <p className="mt-1.5 border-t border-current/15 pt-1.5">
                  <strong>Store Review Note:</strong> {order.cancellationRequest.adminNotes}
                </p>
              )}
            </div>
          )}

          {cancelEligibility.mode === 'shipped_blocked' && order.orderStatus === 'shipped' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-[#1155EE] shrink-0" />
                <span>
                  {cancelEligibility.message}
                  {order.trackingNumber ? ` Tracking: ${order.courierName || 'Courier'} (${order.trackingNumber}).` : ''}
                </span>
              </div>
              <Link to="/contact" className="font-bold text-[#1155EE] hover:underline shrink-0">
                Contact Support →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs">
                <h2 className="font-display mb-4 text-base font-bold text-[#0F1D3A]">Items</h2>
                <ul className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                          <ResilientImage src={item.imageUrl} alt={item.name} />
                        </div>
                        <div>
                          <Link
                            to={`/product/${item.slug}`}
                            className="text-sm font-semibold text-[#0F1D3A] hover:text-[#1155EE]"
                          >
                            {item.name}
                          </Link>
                          <p className="font-mono-tabular text-xs text-slate-500">
                            SKU: {item.sku} · Qty: {item.quantity} × ৳{item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono-tabular text-sm font-bold text-[#0F1D3A]">
                        ৳{item.lineTotal.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs">
                <h2 className="font-display mb-4 text-base font-bold text-[#0F1D3A]">Status Timeline</h2>
                <ul className="space-y-3">
                  {order.statusHistory.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1155EE]" />
                      <div>
                        <p className="font-semibold uppercase text-[#0F1D3A]">
                          {step.toStatus.replace(/_/g, ' ')}
                        </p>
                        {step.reason && <p className="text-slate-600">{step.reason}</p>}
                        <p className="text-slate-400">
                          {new Date(step.timestamp).toLocaleString()} · {step.actorName}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {order.cancellationHistory && order.cancellationHistory.length > 0 && (
                <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs">
                  <h2 className="font-display mb-3 text-base font-bold text-[#0F1D3A]">
                    Cancellation Activity Log
                  </h2>
                  <ul className="space-y-2.5 text-xs">
                    {order.cancellationHistory.map((entry, idx) => {
                      const label = (entry.action || entry.event || 'updated').replace(/_/g, ' ');
                      const detailNote = entry.message || entry.adminNotes || entry.note;
                      return (
                        <li key={idx} className="rounded-xl bg-[#F8FAFF] border border-[#EBF1FC] p-3">
                          <div className="flex items-center justify-between font-bold text-[#0B1730] uppercase">
                            <span>{label}</span>
                            <span className="font-normal text-slate-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.reason && <p className="mt-1 text-slate-700">{entry.reason}</p>}
                          {detailNote && <p className="mt-0.5 text-slate-500">{detailNote}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <aside className="space-y-5 lg:col-span-4">
              <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 text-sm shadow-xs">
                <h2 className="font-display mb-3 text-base font-bold text-[#0F1D3A]">Summary</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status</span>
                    <span className="font-bold uppercase text-[#1155EE]">
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment ({order.paymentMethod.toUpperCase()})</span>
                    <span className="font-bold uppercase">{order.paymentStatus}</span>
                  </div>
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tracking</span>
                      <span className="font-mono-tabular font-semibold">
                        {order.courierName} · {order.trackingNumber}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono-tabular">৳{order.subtotal.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span className="font-mono-tabular">-৳{order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-mono-tabular">৳{order.shippingCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-[#0F1D3A]">
                    <span>Total</span>
                    <span className="font-mono-tabular text-[#1155EE]">৳{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 text-xs text-slate-600 shadow-xs">
                <h3 className="font-display mb-2 text-sm font-bold text-[#0F1D3A]">Shipping Snapshot</h3>
                <p className="font-semibold text-[#0F1D3A]">{order.shippingAddress.recipientName}</p>
                <p>{order.shippingAddress.phone}</p>
                <p className="mt-1">
                  {order.shippingAddress.house}
                  {order.shippingAddress.road ? `, ${order.shippingAddress.road}` : ''},{' '}
                  {order.shippingAddress.area}, {order.shippingAddress.upazila},{' '}
                  {order.shippingAddress.district}, {order.shippingAddress.division}
                </p>
              </div>

              {retryEligible && order.paymentMethod !== 'cod' && (
                <div className="rounded-2xl border border-[#C7DAFD] bg-[#F4F8FF] p-5 text-xs shadow-xs space-y-3">
                  <div className="font-display text-sm font-bold text-[#0F1D3A] flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-[#1155EE]" />
                    Complete Online Payment
                  </div>
                  <p className="text-slate-600">
                    This order is awaiting verified online payment. Choose your preferred gateway below to finish checkout.
                  </p>
                  <select
                    value={retryMethod}
                    onChange={(e) => setRetryMethod(e.target.value as typeof retryMethod)}
                    className="h-9 w-full rounded-xl border border-[#DCE6F7] bg-white px-2.5 text-xs font-semibold text-[#0F1D3A]"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="card">Visa / Mastercard</option>
                    <option value="sslcommerz">SSLCommerz</option>
                  </select>
                  <button
                    type="button"
                    disabled={retryingPayment}
                    onClick={handleRetryPayment}
                    className="w-full rounded-xl bg-[#1155EE] py-2.5 text-xs font-bold text-white hover:bg-[#0B44CC] disabled:opacity-60"
                  >
                    {retryingPayment ? 'Redirecting to Gateway...' : 'Pay Now via Gateway'}
                  </button>
                </div>
              )}

              {Array.isArray(order.paymentTransactions) && order.paymentTransactions.length > 0 && (
                <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 text-xs shadow-xs space-y-2.5">
                  <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Payment Attempts</h3>
                  {order.paymentTransactions.map((tx) => (
                    <div key={tx.id} className="rounded-xl border border-[#EFF4FC] bg-[#F8FAFF] p-2.5 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="uppercase">{tx.provider || tx.gateway}</span>
                        <span className="uppercase text-[#1155EE]">{tx.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="font-mono-tabular text-[11px] text-slate-600">
                        {tx.transactionId} · ৳{tx.amount.toLocaleString()}
                      </div>
                      {(tx.gatewayTransactionId || tx.bankTransactionId) && (
                        <div className="font-mono-tabular text-[11px] text-slate-500">
                          Gateway Ref: {tx.gatewayTransactionId || tx.bankTransactionId}
                        </div>
                      )}
                      {tx.failureReason && <div className="text-[11px] text-rose-600">{tx.failureReason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </AccountLayout>

      {/* Direct Cancel Modal (Pending) */}
      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Order" size="sm">
        <form onSubmit={handleCancelOrder} className="space-y-4">
          <p className="text-xs text-slate-600">
            This pending order will be cancelled immediately and any reserved stock will be released.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Cancellation Reason *</label>
            <textarea
              required
              minLength={3}
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please share why you are cancelling..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-xs font-semibold"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={submittingCancel}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Order Cancellation Modal (Confirmed / Processing / Packed) */}
      <Modal
        open={cancelRequestModalOpen}
        onClose={() => setCancelRequestModalOpen(false)}
        title="Request Order Cancellation"
        size="md"
      >
        <form onSubmit={handleSubmitCancellationRequest} className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Your order is already in <strong>{order.orderStatus}</strong> stage. Submit a cancellation request
            and our fulfillment team will verify before dispatch.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Reason for Cancellation *</label>
            <select
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium"
            >
              {CANCELLATION_REASONS.map((reasonOpt) => (
                <option key={reasonOpt} value={reasonOpt}>
                  {reasonOpt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Additional Message (Optional)
            </label>
            <textarea
              rows={3}
              value={reqMessage}
              onChange={(e) => setReqMessage(e.target.value)}
              placeholder="Add any extra instructions for our fulfillment team..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelRequestModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-xs font-semibold"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={submittingCancelReq}
              className="rounded-lg bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
            >
              {submittingCancelReq ? 'Submitting...' : 'Submit Cancellation Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Request Return" size="sm">
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Return Reason *</label>
            <input
              type="text"
              required
              minLength={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Damaged item / Wrong variant"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Additional Details</label>
            <textarea
              rows={3}
              value={returnDetails}
              onChange={(e) => setReturnDetails(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReturnModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white">
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function SavedAddressesPage() {
  useSeoMeta({ title: 'Address Book | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedAddress | null>(null);

  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [area, setArea] = useState('Kalabagan');
  const [house, setHouse] = useState('');
  const [road, setRoad] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const loadAddresses = () => {
    if (!user) return;
    apiRequest<{ ok: true; addresses: SavedAddress[] }>('/api/account/addresses')
      .then((res) => setAddresses(res.addresses || []))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  if (!user) return <AccountAuthGate title="Address Book" activeKey="addresses" />;

  const openCreateModal = () => {
    setEditingId(null);
    setLabel('Home');
    setRecipientName(user.name);
    setPhone(user.phone || '');
    setDivision('Dhaka');
    setDistrict('Dhaka');
    setUpazila('Dhanmondi');
    setArea('Kalabagan');
    setHouse('');
    setRoad('');
    setIsDefault(addresses.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setLabel(addr.label);
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setDivision(addr.division);
    setDistrict(addr.district);
    setUpazila(addr.upazila);
    setArea(addr.area);
    setHouse(addr.house);
    setRoad(addr.road || '');
    setIsDefault(addr.isDefault);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = { label, recipientName, phone, division, district, upazila, area, house, road, isDefault };
      if (editingId) {
        await apiRequest(`/api/account/addresses/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/api/account/addresses', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      loadAddresses();
      dispatch(showToast({ variant: 'success', message: 'Address saved.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to save address' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/account/addresses/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      loadAddresses();
      dispatch(showToast({ variant: 'info', message: 'Address deleted.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed' }));
    }
  };

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="addresses">
        <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h1 className="font-display text-xl font-extrabold text-[#0F1D3A]">Address Book</h1>
              <p className="text-xs text-slate-500">Manage your saved Bangladesh shipping destinations.</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
            >
              <Plus className="h-4 w-4" /> Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No saved addresses yet. Add your primary delivery address for faster checkout.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="rounded-2xl border border-[#DCE6F7] bg-[#FBFCFF] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#1155EE]" />
                      <span className="text-sm font-bold text-[#0F1D3A]">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => openEditModal(addr)}
                        className="font-semibold text-[#1155EE] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(addr)}
                        aria-label={`Delete ${addr.label}`}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#0F1D3A]">{addr.recipientName}</p>
                  <p className="text-xs text-slate-600">{addr.phone}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {addr.house}
                    {addr.road ? `, ${addr.road}` : ''}, {addr.area}, {addr.upazila}, {addr.district},{' '}
                    {addr.division}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccountLayout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Address' : 'Add New Address'}
        size="md"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (Home / Office)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient Name"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (+880...)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={division}
            onChange={(e) => {
              const d = e.target.value;
              setDivision(d);
              const firstDist = getDistrictsForDivision(d)[0]?.name || '';
              setDistrict(firstDist);
              const firstUpa = getUpazilasForDistrict(d, firstDist)[0]?.name || '';
              setUpazila(firstUpa);
              setArea(getAreasForUpazila(d, firstDist, firstUpa)[0]?.name || '');
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {getDivisionNames().map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={district}
            onChange={(e) => {
              const dist = e.target.value;
              setDistrict(dist);
              const firstUpa = getUpazilasForDistrict(division, dist)[0]?.name || '';
              setUpazila(firstUpa);
              setArea(getAreasForUpazila(division, dist, firstUpa)[0]?.name || '');
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {getDistrictsForDivision(division).map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={upazila}
            onChange={(e) => {
              const upa = e.target.value;
              setUpazila(upa);
              setArea(getAreasForUpazila(division, district, upa)[0]?.name || '');
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {getUpazilasForDistrict(division, district).map((u) => (
              <option key={u.name} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {getAreasForUpazila(division, district, upazila).map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            placeholder="House / Flat *"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={road}
            onChange={(e) => setRoad(e.target.value)}
            placeholder="Road / Street"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Set as default shipping address
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white">
              Save Address
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Address"
        message={`Remove saved address "${deleteTarget?.label}"?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
